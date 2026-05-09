use std::{path::Path, sync::Arc};

use anyhow::Result;
use chrono::{DateTime, Utc};
use image::GenericImageView;

use crate::{services::database::AnalysisPhotoRecord, state::app_state::ScanTaskControl};

#[derive(Debug, Clone)]
pub struct PhotoQualityMetricsRecord {
    pub photo_id: String,
    pub sharpness_score: f64,
    pub exposure_score: f64,
    pub contrast_score: f64,
    pub resolution_score: f64,
    pub overall_score: f64,
}

#[derive(Debug, Clone)]
pub struct PhotoGroupingMemberRecord {
    pub photo_id: String,
    pub similarity_score: f64,
    pub rank_order: i64,
}

#[derive(Debug, Clone)]
pub struct PhotoGroupingRecord {
    pub grouping_type: String,
    pub members: Vec<PhotoGroupingMemberRecord>,
}

#[derive(Debug, Clone)]
pub struct PhotoCurationScoreRecord {
    pub photo_id: String,
    pub ranking_score: f64,
    pub selection_label: String,
    pub selection_reason: String,
    pub duplicate_penalty: f64,
    pub burst_penalty: f64,
    pub confidence_score: f64,
    pub confidence_label: String,
    pub album_candidate: bool,
}

#[derive(Debug, Default)]
pub struct QualityAnalysisResult {
    pub metrics: Vec<PhotoQualityMetricsRecord>,
    pub duplicate_groups: Vec<PhotoGroupingRecord>,
    pub burst_groups: Vec<PhotoGroupingRecord>,
    pub curation_scores: Vec<PhotoCurationScoreRecord>,
    pub failed_photo_ids: Vec<String>,
    pub cancelled: bool,
}

#[derive(Debug, Clone)]
struct PhotoAnalysisArtifact {
    photo_id: String,
    metrics: PhotoQualityMetricsRecord,
    perceptual_hash: u64,
    modified_at: Option<String>,
    filename: String,
    file_size_bytes: u64,
}

pub fn analyze_project_photos<F>(
    photos: &[AnalysisPhotoRecord],
    control: &Arc<ScanTaskControl>,
    on_progress: &mut F,
) -> QualityAnalysisResult
where
    F: FnMut(u64, u64, f64),
{
    let mut result = QualityAnalysisResult::default();
    let mut artifacts = Vec::new();

    for (index, photo) in photos.iter().enumerate() {
        if !control.wait_for_run_permission() {
            result.cancelled = true;
            return finalize_result(result, artifacts);
        }

        match analyze_photo(photo) {
            Ok(artifact) => {
                result.metrics.push(artifact.metrics.clone());
                artifacts.push(artifact);
            }
            Err(_) => result.failed_photo_ids.push(photo.photo_id.clone()),
        }

        let average_score = if result.metrics.is_empty() {
            0.0
        } else {
            result
                .metrics
                .iter()
                .map(|entry| entry.overall_score)
                .sum::<f64>()
                / result.metrics.len() as f64
        };
        on_progress(
            (index + 1) as u64,
            result.failed_photo_ids.len() as u64,
            average_score,
        );
    }

    finalize_result(result, artifacts)
}

fn finalize_result(
    mut result: QualityAnalysisResult,
    artifacts: Vec<PhotoAnalysisArtifact>,
) -> QualityAnalysisResult {
    result.duplicate_groups = build_duplicate_groups(&artifacts);
    result.burst_groups = build_burst_groups(&artifacts);
    result.curation_scores =
        build_curation_scores(&artifacts, &result.duplicate_groups, &result.burst_groups);
    result
}

fn analyze_photo(photo: &AnalysisPhotoRecord) -> Result<PhotoAnalysisArtifact> {
    let image = image::open(Path::new(&photo.absolute_path))?;
    let grayscale = image.to_luma8();
    let (width, height) = image.dimensions();

    let sharpness_score = score_sharpness(&grayscale);
    let exposure_score = score_exposure(&grayscale);
    let contrast_score = score_contrast(&grayscale);
    let resolution_score = score_resolution(width, height);
    let overall_score = clamp_score(
        sharpness_score * 0.34
            + exposure_score * 0.22
            + contrast_score * 0.22
            + resolution_score * 0.22,
    );

    let metrics = PhotoQualityMetricsRecord {
        photo_id: photo.photo_id.clone(),
        sharpness_score,
        exposure_score,
        contrast_score,
        resolution_score,
        overall_score,
    };

    Ok(PhotoAnalysisArtifact {
        photo_id: photo.photo_id.clone(),
        metrics,
        perceptual_hash: difference_hash(&grayscale),
        modified_at: photo.modified_at.clone(),
        filename: photo.filename.clone(),
        file_size_bytes: photo.file_size_bytes,
    })
}

fn build_duplicate_groups(artifacts: &[PhotoAnalysisArtifact]) -> Vec<PhotoGroupingRecord> {
    use std::collections::VecDeque;

    let mut adjacency = vec![Vec::<usize>::new(); artifacts.len()];
    for left in 0..artifacts.len() {
        for right in (left + 1)..artifacts.len() {
            if are_duplicate_neighbors(&artifacts[left], &artifacts[right]) {
                adjacency[left].push(right);
                adjacency[right].push(left);
            }
        }
    }

    let mut visited = vec![false; artifacts.len()];
    let mut groups = Vec::new();

    for start in 0..artifacts.len() {
        if visited[start] {
            continue;
        }

        let mut queue = VecDeque::from([start]);
        let mut members = Vec::new();
        visited[start] = true;

        while let Some(index) = queue.pop_front() {
            members.push(index);
            for &neighbor in &adjacency[index] {
                if !visited[neighbor] {
                    visited[neighbor] = true;
                    queue.push_back(neighbor);
                }
            }
        }

        if members.len() < 2 {
            continue;
        }

        groups.push(build_similarity_group("duplicate", members, artifacts));
    }

    groups
}

fn are_duplicate_neighbors(left: &PhotoAnalysisArtifact, right: &PhotoAnalysisArtifact) -> bool {
    let distance = hamming_distance(left.perceptual_hash, right.perceptual_hash);
    let size_ratio = size_ratio(left.file_size_bytes, right.file_size_bytes);
    distance <= 7 && size_ratio >= 0.90
}

fn build_burst_groups(artifacts: &[PhotoAnalysisArtifact]) -> Vec<PhotoGroupingRecord> {
    let mut sortable: Vec<(i64, usize)> = artifacts
        .iter()
        .enumerate()
        .filter_map(|(index, artifact)| {
            let timestamp = artifact
                .modified_at
                .as_deref()
                .and_then(parse_timestamp_seconds)?;
            Some((timestamp, index))
        })
        .collect();
    sortable.sort_by_key(|(timestamp, _)| *timestamp);

    let mut groups = Vec::new();
    let mut current: Vec<usize> = Vec::new();

    for (_, index) in sortable {
        if current.is_empty() {
            current.push(index);
            continue;
        }

        let previous_index = *current.last().unwrap_or(&index);
        if is_burst_neighbor(&artifacts[previous_index], &artifacts[index]) {
            current.push(index);
        } else {
            if current.len() >= 2 {
                groups.push(build_burst_group(&current, artifacts));
            }
            current = vec![index];
        }
    }

    if current.len() >= 2 {
        groups.push(build_burst_group(&current, artifacts));
    }

    groups
}

fn build_burst_group(
    indices: &[usize],
    artifacts: &[PhotoAnalysisArtifact],
) -> PhotoGroupingRecord {
    build_similarity_group("burst", indices.to_vec(), artifacts)
}

fn build_similarity_group(
    grouping_type: &str,
    mut indices: Vec<usize>,
    artifacts: &[PhotoAnalysisArtifact],
) -> PhotoGroupingRecord {
    indices.sort_by(|left, right| {
        artifacts[*right]
            .metrics
            .overall_score
            .partial_cmp(&artifacts[*left].metrics.overall_score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    let anchor_hash = artifacts[indices[0]].perceptual_hash;
    let members = indices
        .iter()
        .enumerate()
        .map(|(rank, index)| PhotoGroupingMemberRecord {
            photo_id: artifacts[*index].photo_id.clone(),
            similarity_score: 1.0
                - hamming_distance(anchor_hash, artifacts[*index].perceptual_hash) as f64 / 64.0,
            rank_order: rank as i64,
        })
        .collect();

    PhotoGroupingRecord {
        grouping_type: grouping_type.into(),
        members,
    }
}

fn is_burst_neighbor(left: &PhotoAnalysisArtifact, right: &PhotoAnalysisArtifact) -> bool {
    let left_timestamp = left
        .modified_at
        .as_deref()
        .and_then(parse_timestamp_seconds);
    let right_timestamp = right
        .modified_at
        .as_deref()
        .and_then(parse_timestamp_seconds);
    let (Some(left_timestamp), Some(right_timestamp)) = (left_timestamp, right_timestamp) else {
        return false;
    };

    let timestamp_gap = (right_timestamp - left_timestamp).abs();
    if timestamp_gap > 3 {
        return false;
    }

    let normalized_left = normalize_stem(&left.filename);
    let normalized_right = normalize_stem(&right.filename);
    let distance = hamming_distance(left.perceptual_hash, right.perceptual_hash);
    normalized_left == normalized_right || distance <= 18
}

fn normalize_stem(filename: &str) -> String {
    let stem = Path::new(filename)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let trimmed = stem.trim_end_matches(|character: char| {
        character.is_ascii_digit() || matches!(character, '_' | '-' | ' ')
    });
    if trimmed.is_empty() {
        stem
    } else {
        trimmed.to_string()
    }
}

fn parse_timestamp_seconds(value: &str) -> Option<i64> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|datetime| datetime.with_timezone(&Utc).timestamp())
}

fn difference_hash(image: &image::GrayImage) -> u64 {
    let resized = image::imageops::resize(image, 9, 8, image::imageops::FilterType::Triangle);
    let mut hash = 0_u64;

    for y in 0..8 {
        for x in 0..8 {
            let left = resized.get_pixel(x, y)[0];
            let right = resized.get_pixel(x + 1, y)[0];
            if left > right {
                hash |= 1_u64 << (y * 8 + x);
            }
        }
    }

    hash
}

fn hamming_distance(left: u64, right: u64) -> u32 {
    (left ^ right).count_ones()
}

fn size_ratio(left: u64, right: u64) -> f64 {
    let min = left.min(right) as f64;
    let max = left.max(right) as f64;
    if max == 0.0 {
        return 0.0;
    }
    min / max
}

fn build_curation_scores(
    artifacts: &[PhotoAnalysisArtifact],
    duplicate_groups: &[PhotoGroupingRecord],
    burst_groups: &[PhotoGroupingRecord],
) -> Vec<PhotoCurationScoreRecord> {
    use std::collections::HashMap;

    let mut duplicate_positions = HashMap::<String, usize>::new();
    let mut burst_positions = HashMap::<String, usize>::new();

    for group in duplicate_groups {
        for member in &group.members {
            duplicate_positions.insert(member.photo_id.clone(), member.rank_order.max(0) as usize);
        }
    }

    for group in burst_groups {
        for member in &group.members {
            burst_positions.insert(member.photo_id.clone(), member.rank_order.max(0) as usize);
        }
    }

    artifacts
        .iter()
        .map(|artifact| {
            let duplicate_rank = duplicate_positions.get(&artifact.photo_id).copied();
            let burst_rank = burst_positions.get(&artifact.photo_id).copied();
            let duplicate_penalty = duplicate_penalty(duplicate_rank);
            let burst_penalty = burst_penalty(burst_rank);
            let ranking_score =
                clamp_score(artifact.metrics.overall_score - duplicate_penalty - burst_penalty);
            let selection_label = selection_label(ranking_score);
            let confidence_score = confidence_score(
                ranking_score,
                artifact.metrics.overall_score,
                duplicate_rank,
                burst_rank,
            );
            let confidence_label = confidence_label(confidence_score);
            let album_candidate = is_album_candidate(
                selection_label,
                confidence_score,
                duplicate_rank,
                burst_rank,
            );
            let selection_reason = selection_reason(
                artifact.metrics.overall_score,
                duplicate_rank,
                burst_rank,
                confidence_label,
            );

            PhotoCurationScoreRecord {
                photo_id: artifact.photo_id.clone(),
                ranking_score,
                selection_label: selection_label.to_string(),
                selection_reason,
                duplicate_penalty,
                burst_penalty,
                confidence_score,
                confidence_label: confidence_label.to_string(),
                album_candidate,
            }
        })
        .collect()
}

fn duplicate_penalty(rank: Option<usize>) -> f64 {
    match rank {
        None | Some(0) => 0.0,
        Some(1) => 0.14,
        Some(rank) => (0.2 + ((rank.saturating_sub(2)) as f64 * 0.05)).min(0.38),
    }
}

fn burst_penalty(rank: Option<usize>) -> f64 {
    match rank {
        None | Some(0) => 0.0,
        Some(1) => 0.05,
        Some(rank) => (0.1 + ((rank.saturating_sub(2)) as f64 * 0.03)).min(0.22),
    }
}

fn selection_label(score: f64) -> &'static str {
    if score >= 0.78 {
        "keep"
    } else if score >= 0.56 {
        "review"
    } else {
        "reject"
    }
}

fn confidence_score(
    ranking_score: f64,
    overall_score: f64,
    duplicate_rank: Option<usize>,
    burst_rank: Option<usize>,
) -> f64 {
    let distance_from_review_edge = (ranking_score - 0.56)
        .abs()
        .min((ranking_score - 0.78).abs());
    let boundary_confidence = clamp_score(0.48 + distance_from_review_edge * 2.4);
    let quality_confidence = clamp_score(overall_score * 0.7 + ranking_score * 0.3);
    let grouping_confidence = match (duplicate_rank, burst_rank) {
        (Some(0), Some(0)) => 0.95,
        (Some(0), _) | (_, Some(0)) => 0.88,
        (Some(_), _) | (_, Some(_)) => 0.68,
        _ => 0.78,
    };

    clamp_score(boundary_confidence * 0.38 + quality_confidence * 0.42 + grouping_confidence * 0.20)
}

fn confidence_label(score: f64) -> &'static str {
    if score >= 0.76 {
        "high"
    } else if score >= 0.58 {
        "medium"
    } else {
        "low"
    }
}

fn is_album_candidate(
    selection_label: &str,
    confidence_score: f64,
    duplicate_rank: Option<usize>,
    burst_rank: Option<usize>,
) -> bool {
    selection_label == "keep"
        && confidence_score >= 0.72
        && !matches!(duplicate_rank, Some(rank) if rank > 0)
        && !matches!(burst_rank, Some(rank) if rank > 1)
}

fn selection_reason(
    overall_score: f64,
    duplicate_rank: Option<usize>,
    burst_rank: Option<usize>,
    confidence_label: &str,
) -> String {
    let quality_note = if overall_score >= 0.82 {
        "strong technical quality"
    } else if overall_score >= 0.68 {
        "usable technical quality"
    } else {
        "weak technical quality"
    };

    let duplicate_note = match duplicate_rank {
        Some(0) => Some("best duplicate frame"),
        Some(_) => Some("lower-ranked duplicate frame"),
        None => None,
    };

    let burst_note = match burst_rank {
        Some(0) => Some("best burst candidate"),
        Some(_) => Some("secondary burst frame"),
        None => None,
    };

    let mut notes = vec![quality_note.to_string()];
    if let Some(note) = duplicate_note {
        notes.push(note.to_string());
    }
    if let Some(note) = burst_note {
        notes.push(note.to_string());
    }
    if duplicate_note.is_none() && burst_note.is_none() {
        notes.push("standalone frame".to_string());
    }
    notes.push(format!("{confidence_label} confidence"));

    notes.join("; ")
}

fn score_sharpness(image: &image::GrayImage) -> f64 {
    let width = image.width();
    let height = image.height();
    if width < 3 || height < 3 {
        return 0.0;
    }

    let mut total = 0.0;
    let mut samples = 0.0;

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let center = image.get_pixel(x, y)[0] as f64;
            let left = image.get_pixel(x - 1, y)[0] as f64;
            let right = image.get_pixel(x + 1, y)[0] as f64;
            let top = image.get_pixel(x, y - 1)[0] as f64;
            let bottom = image.get_pixel(x, y + 1)[0] as f64;
            let laplacian = (4.0 * center - left - right - top - bottom).abs();
            total += laplacian;
            samples += 1.0;
        }
    }

    clamp_score((total / samples) / 48.0)
}

fn score_exposure(image: &image::GrayImage) -> f64 {
    let mean = mean_luminance(image);
    clamp_score(1.0 - ((mean - 0.5).abs() / 0.5))
}

fn score_contrast(image: &image::GrayImage) -> f64 {
    let mean = mean_luminance(image);
    let mut variance = 0.0;
    let mut count = 0.0;

    for pixel in image.pixels() {
        let value = pixel[0] as f64 / 255.0;
        variance += (value - mean).powi(2);
        count += 1.0;
    }

    if count == 0.0 {
        return 0.0;
    }

    let stddev = (variance / count).sqrt();
    clamp_score(stddev / 0.26)
}

fn score_resolution(width: u32, height: u32) -> f64 {
    let pixels = width as f64 * height as f64;
    let baseline = 4000_f64 * 3000_f64;
    clamp_score((pixels / baseline).sqrt())
}

fn mean_luminance(image: &image::GrayImage) -> f64 {
    let mut total = 0.0;
    let mut count = 0.0;
    for pixel in image.pixels() {
        total += pixel[0] as f64 / 255.0;
        count += 1.0;
    }
    if count == 0.0 {
        return 0.0;
    }
    total / count
}

fn clamp_score(value: f64) -> f64 {
    value.clamp(0.0, 1.0)
}
#[cfg(test)]
mod tests {
    use super::*;

    fn artifact(
        id: &str,
        hash: u64,
        score: f64,
        modified_at: Option<&str>,
        filename: &str,
        file_size_bytes: u64,
    ) -> PhotoAnalysisArtifact {
        PhotoAnalysisArtifact {
            photo_id: id.to_string(),
            metrics: PhotoQualityMetricsRecord {
                photo_id: id.to_string(),
                sharpness_score: score,
                exposure_score: score,
                contrast_score: score,
                resolution_score: score,
                overall_score: score,
            },
            perceptual_hash: hash,
            modified_at: modified_at.map(str::to_string),
            filename: filename.to_string(),
            file_size_bytes,
        }
    }

    #[test]
    fn duplicate_grouping_uses_connected_components() {
        let artifacts = vec![
            artifact("a", 0, 0.70, None, "a.jpg", 1_000),
            artifact("b", 0b00000000_01111111, 0.82, None, "b.jpg", 1_020),
            artifact("c", 0b00111111_11111111, 0.76, None, "c.jpg", 980),
            artifact("d", 0xffff_ffff_ffff_ffff, 0.95, None, "d.jpg", 1_000),
        ];

        let groups = build_duplicate_groups(&artifacts);

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].members.len(), 3);
        assert_eq!(groups[0].members[0].photo_id, "b");
        assert_eq!(groups[0].members[0].rank_order, 0);
    }

    #[test]
    fn burst_grouping_uses_time_and_visual_affinity() {
        let artifacts = vec![
            artifact(
                "a",
                0b0000,
                0.70,
                Some("2026-05-09T10:00:00Z"),
                "IMG_0001.jpg",
                1_000,
            ),
            artifact(
                "b",
                0b0001,
                0.90,
                Some("2026-05-09T10:00:02Z"),
                "IMG_0002.jpg",
                1_000,
            ),
            artifact(
                "c",
                0b0011,
                0.80,
                Some("2026-05-09T10:00:04Z"),
                "IMG_0003.jpg",
                1_000,
            ),
            artifact(
                "d",
                0b1111_0000,
                0.85,
                Some("2026-05-09T10:00:10Z"),
                "OTHER_0100.jpg",
                1_000,
            ),
        ];

        let groups = build_burst_groups(&artifacts);

        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].members.len(), 3);
        assert_eq!(groups[0].members[0].photo_id, "b");
    }

    #[test]
    fn curation_scores_penalize_lower_ranked_duplicates() {
        let artifacts = vec![
            artifact("best", 0b0000, 0.95, None, "best.jpg", 1_000),
            artifact("second", 0b0001, 0.80, None, "second.jpg", 1_000),
        ];
        let duplicate_groups = build_duplicate_groups(&artifacts);
        let scores = build_curation_scores(&artifacts, &duplicate_groups, &[]);
        let best = scores
            .iter()
            .find(|score| score.photo_id == "best")
            .unwrap();
        let second = scores
            .iter()
            .find(|score| score.photo_id == "second")
            .unwrap();

        assert_eq!(best.selection_label, "keep");
        assert_eq!(best.confidence_label, "high");
        assert!(best.album_candidate);
        assert_eq!(second.duplicate_penalty, 0.14);
        assert!(second.ranking_score < best.ranking_score);
        assert!(second
            .selection_reason
            .contains("lower-ranked duplicate frame"));
        assert!(!second.album_candidate);
    }

    #[test]
    fn confidence_labels_follow_thresholds() {
        assert_eq!(confidence_label(0.76), "high");
        assert_eq!(confidence_label(0.58), "medium");
        assert_eq!(confidence_label(0.57), "low");
    }
}
