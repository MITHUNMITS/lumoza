use std::collections::{HashMap, HashSet};

use crate::services::database::{FinalSelectionItemRecord, SelectionCandidateRecord};

#[derive(Debug, Default)]
pub struct SmartSelectionResult {
    pub items: Vec<FinalSelectionItemRecord>,
    pub selected_count: u64,
    pub review_count: u64,
    pub rejected_count: u64,
    pub protected_count: u64,
}

#[derive(Debug, Clone)]
struct ScoredCandidate<'a> {
    candidate: &'a SelectionCandidateRecord,
    score: f64,
    quality_score: f64,
    people_score: f64,
    diversity_score: f64,
    confidence_score: f64,
    event_key: Option<String>,
    explanation: String,
    coverage_reason: String,
}

#[derive(Default)]
struct CoverageTracker {
    selected_photo_ids: HashSet<String>,
    duplicate_seen: HashMap<String, u64>,
    burst_seen: HashMap<String, u64>,
    event_seen: HashSet<String>,
}

pub fn build_smart_selection(
    candidates: &[SelectionCandidateRecord],
    final_count_target: u64,
    review_count_target: u64,
) -> SmartSelectionResult {
    let final_target = final_count_target.clamp(1, candidates.len().max(1) as u64) as usize;
    let review_target = review_count_target.clamp(0, candidates.len() as u64) as usize;
    let mut scored = candidates.iter().map(score_candidate).collect::<Vec<_>>();

    scored.sort_by(|left, right| {
        right
            .score
            .total_cmp(&left.score)
            .then_with(|| right.candidate.modified_at.cmp(&left.candidate.modified_at))
            .then_with(|| left.candidate.filename.cmp(&right.candidate.filename))
    });

    let mut coverage = CoverageTracker::default();
    let mut final_items = Vec::new();
    let mut review_items = Vec::new();
    let mut rejected_items = Vec::new();
    let mut protected_count = 0_u64;

    for scored_candidate in &scored {
        if is_force_excluded(scored_candidate) {
            continue;
        }
        if matches!(
            scored_candidate.candidate.override_label.as_deref(),
            Some("force_include" | "protect")
        ) {
            push_final(
                &mut final_items,
                &mut coverage,
                scored_candidate,
                final_target,
            );
            protected_count += 1;
        }
    }

    let distinct_event_count = scored
        .iter()
        .filter_map(|candidate| candidate.event_key.as_deref())
        .collect::<HashSet<_>>()
        .len();
    let event_coverage_goal = if final_target >= 2 && distinct_event_count >= 2 {
        ((final_target as f64 * 0.35).ceil() as usize).clamp(2, final_target)
    } else {
        0
    };

    for scored_candidate in &scored {
        if final_items.len() >= event_coverage_goal || final_items.len() >= final_target {
            break;
        }
        if !is_final_candidate(scored_candidate, &coverage) {
            continue;
        }
        let Some(event_key) = scored_candidate.event_key.as_deref() else {
            continue;
        };
        if coverage.event_seen.contains(event_key) || scored_candidate.score < 0.42 {
            continue;
        }
        push_final(
            &mut final_items,
            &mut coverage,
            scored_candidate,
            final_target,
        );
    }

    for scored_candidate in &scored {
        if final_items.len() >= final_target {
            break;
        }
        if !is_final_candidate(scored_candidate, &coverage) {
            continue;
        }
        push_final(
            &mut final_items,
            &mut coverage,
            scored_candidate,
            final_target,
        );
    }

    for scored_candidate in &scored {
        if review_items.len() >= review_target {
            break;
        }
        if coverage
            .selected_photo_ids
            .contains(&scored_candidate.candidate.photo_id)
            || is_force_excluded(scored_candidate)
        {
            continue;
        }
        if should_prioritize_review(scored_candidate) {
            push_review(&mut review_items, &mut coverage, scored_candidate);
        }
    }

    for scored_candidate in &scored {
        if review_items.len() >= review_target {
            break;
        }
        if coverage
            .selected_photo_ids
            .contains(&scored_candidate.candidate.photo_id)
            || is_force_excluded(scored_candidate)
        {
            continue;
        }
        if should_review(scored_candidate) {
            push_review(&mut review_items, &mut coverage, scored_candidate);
        }
    }

    for scored_candidate in &scored {
        if coverage
            .selected_photo_ids
            .contains(&scored_candidate.candidate.photo_id)
        {
            continue;
        }
        rejected_items.push(to_item(
            scored_candidate,
            "rejected",
            rejected_items.len() as u64 + 1,
        ));
    }

    let selected_count = final_items.len() as u64;
    let review_count = review_items.len() as u64;
    let rejected_count = rejected_items.len() as u64;
    final_items.append(&mut review_items);
    final_items.append(&mut rejected_items);

    SmartSelectionResult {
        items: final_items,
        selected_count,
        review_count,
        rejected_count,
        protected_count,
    }
}

fn is_force_excluded(scored: &ScoredCandidate<'_>) -> bool {
    matches!(
        scored.candidate.override_label.as_deref(),
        Some("force_exclude")
    )
}

fn is_final_candidate(scored: &ScoredCandidate<'_>, coverage: &CoverageTracker) -> bool {
    if coverage
        .selected_photo_ids
        .contains(&scored.candidate.photo_id)
        || is_force_excluded(scored)
        || is_low_confidence(scored)
    {
        return false;
    }

    group_variation_allowed(scored, coverage)
}

fn group_variation_allowed(scored: &ScoredCandidate<'_>, coverage: &CoverageTracker) -> bool {
    let duplicate_count = scored
        .candidate
        .duplicate_group_id
        .as_ref()
        .and_then(|group| coverage.duplicate_seen.get(group))
        .copied()
        .unwrap_or(0);
    let burst_count = scored
        .candidate
        .burst_group_id
        .as_ref()
        .and_then(|group| coverage.burst_seen.get(group))
        .copied()
        .unwrap_or(0);

    let has_priority_people = scored.candidate.priority_people_count > 0;
    let allow_group_variation = has_priority_people && duplicate_count < 2 && burst_count < 3;
    (duplicate_count == 0 && burst_count <= 1) || allow_group_variation
}

fn push_final(
    final_items: &mut Vec<FinalSelectionItemRecord>,
    coverage: &mut CoverageTracker,
    scored: &ScoredCandidate<'_>,
    final_target: usize,
) {
    if final_items.len() >= final_target
        && !matches!(
            scored.candidate.override_label.as_deref(),
            Some("force_include" | "protect")
        )
    {
        return;
    }
    final_items.push(to_item(scored, "final", final_items.len() as u64 + 1));
    record_selection_coverage(coverage, scored);
}

fn push_review(
    review_items: &mut Vec<FinalSelectionItemRecord>,
    coverage: &mut CoverageTracker,
    scored: &ScoredCandidate<'_>,
) {
    review_items.push(to_item(scored, "review", review_items.len() as u64 + 1));
    coverage
        .selected_photo_ids
        .insert(scored.candidate.photo_id.clone());
}

fn record_selection_coverage(coverage: &mut CoverageTracker, scored: &ScoredCandidate<'_>) {
    coverage
        .selected_photo_ids
        .insert(scored.candidate.photo_id.clone());
    if let Some(group) = &scored.candidate.duplicate_group_id {
        *coverage.duplicate_seen.entry(group.clone()).or_insert(0) += 1;
    }
    if let Some(group) = &scored.candidate.burst_group_id {
        *coverage.burst_seen.entry(group.clone()).or_insert(0) += 1;
    }
    if let Some(event_key) = &scored.event_key {
        coverage.event_seen.insert(event_key.clone());
    }
}

fn score_candidate(candidate: &SelectionCandidateRecord) -> ScoredCandidate<'_> {
    let quality_score = candidate
        .ranking_score
        .or(candidate.overall_score)
        .unwrap_or(0.45)
        .clamp(0.0, 1.0);
    let confidence_score = candidate.confidence_score.unwrap_or(0.50).clamp(0.0, 1.0);
    let people_score = people_score(candidate);
    let event_key = event_key(candidate);
    let diversity_score = diversity_score(candidate, event_key.is_some());
    let album_boost = if candidate.album_candidate { 0.05 } else { 0.0 };
    let review_penalty = if candidate.selection_label.as_deref() == Some("reject") {
        0.12
    } else {
        0.0
    };
    let low_confidence_penalty = if confidence_score < 0.50 { 0.10 } else { 0.0 };
    let override_boost = match candidate.override_label.as_deref() {
        Some("force_include" | "protect") => 0.35,
        Some("force_exclude") => -1.0,
        _ => 0.0,
    };
    let score = (quality_score * 0.36
        + people_score * 0.28
        + diversity_score * 0.20
        + confidence_score * 0.16
        + album_boost
        + override_boost
        - review_penalty
        - low_confidence_penalty)
        .clamp(0.0, 1.0);

    ScoredCandidate {
        candidate,
        score,
        quality_score,
        people_score,
        diversity_score,
        confidence_score,
        event_key,
        explanation: build_explanation(
            candidate,
            quality_score,
            people_score,
            diversity_score,
            confidence_score,
        ),
        coverage_reason: build_coverage_reason(candidate),
    }
}

fn people_score(candidate: &SelectionCandidateRecord) -> f64 {
    let priority = match candidate.priority_people_count {
        0 => 0.0,
        1 => 0.58,
        2 => 0.78,
        _ => 0.92,
    };
    let named = (candidate.named_people_count as f64 * 0.12).min(0.30);
    let faces = (candidate.face_count as f64 * 0.035).min(0.18);
    (priority + named + faces).clamp(0.0, 1.0)
}

fn diversity_score(candidate: &SelectionCandidateRecord, has_event_context: bool) -> f64 {
    let mut score: f64 = 0.70;
    if candidate.duplicate_group_id.is_some() {
        score -= 0.12;
    }
    if candidate.burst_group_id.is_some() {
        score -= 0.08;
    }
    if candidate.face_count > 1 || candidate.priority_people_count > 0 {
        score += 0.16;
    }
    if has_event_context {
        score += 0.06;
    }
    score.clamp(0.0, 1.0)
}

fn should_prioritize_review(scored: &ScoredCandidate<'_>) -> bool {
    is_low_confidence(scored) || scored.candidate.selection_label.as_deref() == Some("review")
}

fn should_review(scored: &ScoredCandidate<'_>) -> bool {
    if matches!(
        scored.candidate.override_label.as_deref(),
        Some("protect" | "force_include")
    ) {
        return false;
    }
    scored.candidate.confidence_label.as_deref() != Some("high")
        || scored.people_score >= 0.55
        || scored.score >= 0.50
        || scored.candidate.selection_label.as_deref() == Some("review")
}

fn is_low_confidence(scored: &ScoredCandidate<'_>) -> bool {
    scored.candidate.confidence_label.as_deref() == Some("low") || scored.confidence_score < 0.50
}

fn to_item(scored: &ScoredCandidate<'_>, bucket: &str, rank: u64) -> FinalSelectionItemRecord {
    FinalSelectionItemRecord {
        photo_id: scored.candidate.photo_id.clone(),
        selection_bucket: bucket.to_string(),
        final_rank: rank,
        selection_score: scored.score,
        quality_score: scored.quality_score,
        people_score: scored.people_score,
        diversity_score: scored.diversity_score,
        confidence_score: scored.confidence_score,
        explanation: scored.explanation.clone(),
        coverage_reason: scored.coverage_reason.clone(),
    }
}

fn build_explanation(
    candidate: &SelectionCandidateRecord,
    quality_score: f64,
    people_score: f64,
    diversity_score: f64,
    confidence_score: f64,
) -> String {
    let mut parts = Vec::new();
    if candidate.override_label.as_deref() == Some("protect") {
        parts.push("protected by user".to_string());
    } else if candidate.override_label.as_deref() == Some("force_include") {
        parts.push("forced into final selection".to_string());
    }
    if people_score >= 0.55 {
        parts.push("important people coverage".to_string());
    }
    if quality_score >= 0.72 {
        parts.push("strong technical quality".to_string());
    }
    if event_key(candidate).is_some() {
        parts.push("covers a distinct moment".to_string());
    }
    if diversity_score >= 0.75 {
        parts.push("useful memory variation".to_string());
    }
    if confidence_score < 0.55 {
        parts.push("held for review due to lower confidence".to_string());
    }
    if parts.is_empty() {
        parts.push("balanced memory score".to_string());
    }
    parts.join("; ")
}

fn build_coverage_reason(candidate: &SelectionCandidateRecord) -> String {
    if candidate.priority_people_count > 0 {
        "priority people".to_string()
    } else if candidate.face_count > 1 {
        "group memory".to_string()
    } else if candidate.burst_group_id.is_some() {
        "burst representative".to_string()
    } else if candidate.duplicate_group_id.is_some() {
        "duplicate representative".to_string()
    } else if event_key(candidate).is_some() {
        "event coverage".to_string()
    } else {
        "story diversity".to_string()
    }
}

fn event_key(candidate: &SelectionCandidateRecord) -> Option<String> {
    let modified_at = candidate.modified_at.as_deref()?.trim();
    if modified_at.len() >= 10 {
        Some(modified_at[..10].to_string())
    } else if !modified_at.is_empty() {
        Some(modified_at.to_string())
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn candidate(id: &str, score: f64, priority: u64) -> SelectionCandidateRecord {
        SelectionCandidateRecord {
            photo_id: id.to_string(),
            filename: format!("{id}.jpg"),
            modified_at: None,
            overall_score: Some(score),
            ranking_score: Some(score),
            confidence_score: Some(score),
            confidence_label: Some("high".to_string()),
            selection_label: Some("keep".to_string()),
            album_candidate: false,
            duplicate_group_id: None,
            burst_group_id: None,
            priority_people_count: priority,
            named_people_count: priority,
            face_count: priority,
            override_label: None,
        }
    }

    #[test]
    fn priority_people_can_outrank_slightly_higher_quality_photo() {
        let result = build_smart_selection(
            &[candidate("plain", 0.82, 0), candidate("family", 0.72, 2)],
            1,
            0,
        );
        assert_eq!(result.items[0].photo_id, "family");
        assert_eq!(result.selected_count, 1);
    }

    #[test]
    fn force_exclude_removes_photo_from_final_bucket() {
        let mut excluded = candidate("excluded", 0.99, 3);
        excluded.override_label = Some("force_exclude".to_string());
        let result = build_smart_selection(&[excluded, candidate("next", 0.60, 0)], 1, 0);
        assert_eq!(result.items[0].photo_id, "next");
        assert_eq!(result.items[0].selection_bucket, "final");
    }

    #[test]
    fn event_coverage_preserves_distinct_days_before_repeating_one_day() {
        let mut day_one_best = candidate("day-one-best", 0.94, 0);
        day_one_best.modified_at = Some("2026-01-01T10:00:00Z".to_string());
        let mut day_one_second = candidate("day-one-second", 0.93, 0);
        day_one_second.modified_at = Some("2026-01-01T11:00:00Z".to_string());
        let mut day_two = candidate("day-two", 0.58, 0);
        day_two.modified_at = Some("2026-01-02T10:00:00Z".to_string());

        let result = build_smart_selection(&[day_one_best, day_one_second, day_two], 2, 0);
        let final_ids = result
            .items
            .iter()
            .filter(|item| item.selection_bucket == "final")
            .map(|item| item.photo_id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(final_ids, vec!["day-one-best", "day-two"]);
    }

    #[test]
    fn low_confidence_memory_moves_to_review_before_rejection() {
        let mut uncertain = candidate("uncertain", 0.91, 0);
        uncertain.confidence_score = Some(0.32);
        uncertain.confidence_label = Some("low".to_string());
        let confident = candidate("confident", 0.78, 0);

        let result = build_smart_selection(&[uncertain, confident], 1, 1);
        let uncertain_item = result
            .items
            .iter()
            .find(|item| item.photo_id == "uncertain")
            .expect("uncertain item should remain queryable");

        assert_eq!(uncertain_item.selection_bucket, "review");
        assert!(uncertain_item
            .explanation
            .contains("held for review due to lower confidence"));
    }
}
