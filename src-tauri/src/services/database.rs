use std::{fs, path::Path};

use anyhow::Context;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Transaction};

use crate::{
    commands::project::ProjectSummary,
    services::{
        people_analyzer::{FaceDetectionRecord, PeopleAnalysisResult, PeopleClusterRecord},
        quality_analyzer::{
            PhotoCurationScoreRecord, PhotoGroupingRecord, PhotoQualityMetricsRecord,
        },
        scan_indexer::IndexedPhoto,
        smart_selector::SmartSelectionResult,
        thumbnail_pipeline::GeneratedThumbnail,
    },
};

const MIGRATIONS: [&str; 6] = [
    include_str!("../../migrations/0001_init.sql"),
    include_str!("../../migrations/0002_analysis.sql"),
    include_str!("../../migrations/0003_ranking.sql"),
    include_str!("../../migrations/0004_curation_confidence.sql"),
    include_str!("../../migrations/0005_people.sql"),
    include_str!("../../migrations/0006_smart_selection.sql"),
];

#[derive(Debug)]
pub struct PersistedScanSummary {
    pub indexed_count: u64,
    pub failed_count: u64,
}

#[derive(Debug)]
pub struct ProjectPhotoRecord {
    pub id: String,
    pub absolute_path: String,
    pub filename: String,
    pub extension: String,
    pub file_size_bytes: u64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub modified_at: Option<String>,
    pub thumbnail_status: String,
    pub thumbnail_cache_path: Option<String>,
    pub sharpness_score: Option<f64>,
    pub exposure_score: Option<f64>,
    pub contrast_score: Option<f64>,
    pub resolution_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub duplicate_group_id: Option<String>,
    pub burst_group_id: Option<String>,
    pub ranking_score: Option<f64>,
    pub selection_label: Option<String>,
    pub selection_reason: Option<String>,
    pub confidence_score: Option<f64>,
    pub confidence_label: Option<String>,
    pub album_candidate: bool,
}

#[derive(Debug)]
pub struct ProjectAnalysisSummaryRecord {
    pub analyzed_photo_count: u64,
    pub average_overall_score: Option<f64>,
    pub duplicate_group_count: u64,
    pub burst_group_count: u64,
    pub keep_count: u64,
    pub review_count: u64,
    pub reject_count: u64,
    pub high_confidence_count: u64,
    pub album_candidate_count: u64,
}

#[derive(Debug)]
pub struct CurationGroupSummaryRecord {
    pub group_id: String,
    pub grouping_type: String,
    pub member_count: u64,
    pub best_photo_id: Option<String>,
    pub best_filename: Option<String>,
    pub average_similarity: Option<f64>,
}

#[derive(Debug)]
pub struct ProjectPeopleSummaryRecord {
    pub face_analysis_run_count: u64,
    pub detected_face_count: u64,
    pub clustered_people_count: u64,
    pub named_people_count: u64,
    pub priority_people_count: u64,
    pub unassigned_face_count: u64,
    pub photos_with_faces_count: u64,
}

#[derive(Debug, Clone)]
pub struct ProjectPersonFaceRecord {
    pub id: String,
    pub photo_id: String,
    pub filename: Option<String>,
    pub crop_cache_path: Option<String>,
    pub bounding_box_x: f64,
    pub bounding_box_y: f64,
    pub bounding_box_width: f64,
    pub bounding_box_height: f64,
    pub detection_confidence: f64,
    pub quality_score: f64,
    pub is_representative: bool,
}

#[derive(Debug, Clone)]
pub struct ProjectPersonRecord {
    pub id: String,
    pub display_name: Option<String>,
    pub representative_face_id: Option<String>,
    pub representative_crop_cache_path: Option<String>,
    pub face_count: u64,
    pub photo_count: u64,
    pub priority_label: String,
    pub is_hidden: bool,
    pub faces: Vec<ProjectPersonFaceRecord>,
}

#[derive(Debug, Clone)]
pub struct SelectionCandidateRecord {
    pub photo_id: String,
    pub filename: String,
    pub modified_at: Option<String>,
    pub overall_score: Option<f64>,
    pub ranking_score: Option<f64>,
    pub confidence_score: Option<f64>,
    pub confidence_label: Option<String>,
    pub selection_label: Option<String>,
    pub album_candidate: bool,
    pub duplicate_group_id: Option<String>,
    pub burst_group_id: Option<String>,
    pub priority_people_count: u64,
    pub named_people_count: u64,
    pub face_count: u64,
    pub override_label: Option<String>,
}

#[derive(Debug, Clone)]
pub struct FinalSelectionItemRecord {
    pub photo_id: String,
    pub selection_bucket: String,
    pub final_rank: u64,
    pub selection_score: f64,
    pub quality_score: f64,
    pub people_score: f64,
    pub diversity_score: f64,
    pub confidence_score: f64,
    pub explanation: String,
    pub coverage_reason: String,
}

#[derive(Debug, Clone)]
pub struct SelectionSummaryRecord {
    pub selection_run_count: u64,
    pub final_count_target: u64,
    pub review_count_target: u64,
    pub selected_count: u64,
    pub review_count: u64,
    pub rejected_count: u64,
    pub protected_count: u64,
    pub last_status: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AnalysisPhotoRecord {
    pub photo_id: String,
    pub absolute_path: String,
    pub filename: String,
    pub modified_at: Option<String>,
    pub file_size_bytes: u64,
}

pub fn initialize_project_database(path: &Path) -> anyhow::Result<()> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    Ok(())
}

pub fn ensure_project_bootstrap(path: &Path, project: &ProjectSummary) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;

    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();
    upsert_project(&transaction, project, &now)?;
    upsert_source_folder(&transaction, project, &now)?;
    transaction.commit()?;
    Ok(())
}

pub fn persist_scan(
    path: &Path,
    project: &ProjectSummary,
    scan_id: &str,
    photos: &[IndexedPhoto],
    failed_count: u64,
) -> anyhow::Result<PersistedScanSummary> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();
    let source_folder_id = source_folder_id(&project.project_id);

    upsert_project(&transaction, project, &now)?;
    upsert_source_folder(&transaction, project, &now)?;

    transaction.execute(
        "DELETE FROM duplicate_group_members WHERE group_id IN (SELECT id FROM duplicate_groups)",
        [],
    )?;
    transaction.execute("DELETE FROM duplicate_groups", [])?;
    transaction.execute("DELETE FROM photo_curation_recommendations", [])?;
    transaction.execute("DELETE FROM photo_curation_scores", [])?;
    transaction.execute("DELETE FROM photo_quality_metrics", [])?;
    transaction.execute("DELETE FROM person_faces", [])?;
    transaction.execute("DELETE FROM people_clusters", [])?;
    transaction.execute("DELETE FROM face_detections", [])?;
    transaction.execute("DELETE FROM face_analysis_runs", [])?;
    transaction.execute("DELETE FROM final_selection_items", [])?;
    transaction.execute("DELETE FROM selection_runs", [])?;
    transaction.execute("DELETE FROM photo_selection_overrides", [])?;
    transaction.execute("DELETE FROM analysis_runs", [])?;
    transaction.execute(
        "DELETE FROM thumbnails WHERE photo_id IN (SELECT id FROM photos WHERE source_folder_id = ?1)",
        params![source_folder_id.as_str()],
    )?;
    transaction.execute(
        "DELETE FROM photos WHERE source_folder_id = ?1",
        params![source_folder_id.as_str()],
    )?;

    transaction.execute(
        "INSERT INTO scans (id, status, started_at, ended_at, files_discovered, files_indexed, files_failed, pause_requested_at, cancel_requested_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, NULL)",
        params![
            scan_id,
            "completed",
            now.as_str(),
            now.as_str(),
            photos.len() as i64,
            photos.len() as i64,
            failed_count as i64,
        ],
    )?;

    {
        let mut statement = transaction.prepare(
            "INSERT INTO photos (
                id,
                source_folder_id,
                absolute_path,
                filename,
                extension,
                file_size_bytes,
                width,
                height,
                captured_at,
                modified_at,
                checksum_quick,
                thumbnail_status,
                ingest_status
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, NULL, ?7, NULL, ?8, ?9)",
        )?;

        for photo in photos {
            statement.execute(params![
                photo.id.as_str(),
                source_folder_id.as_str(),
                photo.absolute_path.as_str(),
                photo.filename.as_str(),
                photo.extension.as_str(),
                photo.file_size_bytes as i64,
                photo.modified_at.as_deref(),
                "pending",
                "indexed",
            ])?;
        }
    }

    transaction.execute(
        "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            format!("scan-complete-{scan_id}"),
            "scan_completed",
            if failed_count > 0 { "warning" } else { "info" },
            format!("Indexed {} supported photos.", photos.len()),
            format!(
                r#"{{"failedCount": {}, "indexedCount": {}}}"#,
                failed_count,
                photos.len()
            ),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;

    Ok(PersistedScanSummary {
        indexed_count: photos.len() as u64,
        failed_count,
    })
}

pub fn list_selection_candidate_records(
    path: &Path,
) -> anyhow::Result<Vec<SelectionCandidateRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let mut statement = connection.prepare(
        "SELECT
            photos.id,
            photos.filename,
            photos.modified_at,
            photo_quality_metrics.overall_score,
            photo_curation_scores.ranking_score,
            photo_curation_recommendations.confidence_score,
            photo_curation_recommendations.confidence_label,
            photo_curation_scores.selection_label,
            photo_curation_recommendations.album_candidate,
            duplicate_groups.id,
            burst_groups.id,
            COUNT(DISTINCT CASE WHEN people_clusters.priority_label != 'unassigned' THEN people_clusters.id END),
            COUNT(DISTINCT CASE WHEN people_clusters.display_name IS NOT NULL AND TRIM(people_clusters.display_name) != '' THEN people_clusters.id END),
            COUNT(DISTINCT face_detections.id),
            photo_selection_overrides.override_label
         FROM photos
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
         LEFT JOIN photo_curation_scores ON photo_curation_scores.photo_id = photos.id
         LEFT JOIN photo_curation_recommendations ON photo_curation_recommendations.photo_id = photos.id
         LEFT JOIN duplicate_group_members AS duplicate_members ON duplicate_members.photo_id = photos.id
         LEFT JOIN duplicate_groups ON duplicate_groups.id = duplicate_members.group_id AND duplicate_groups.grouping_type = 'duplicate'
         LEFT JOIN duplicate_group_members AS burst_members ON burst_members.photo_id = photos.id
         LEFT JOIN duplicate_groups AS burst_groups ON burst_groups.id = burst_members.group_id AND burst_groups.grouping_type = 'burst'
         LEFT JOIN face_detections ON face_detections.photo_id = photos.id
         LEFT JOIN person_faces ON person_faces.face_detection_id = face_detections.id
         LEFT JOIN people_clusters ON people_clusters.id = person_faces.person_id AND people_clusters.is_hidden = 0
         LEFT JOIN photo_selection_overrides ON photo_selection_overrides.photo_id = photos.id
         GROUP BY photos.id, photos.filename, photos.modified_at, photo_quality_metrics.overall_score, photo_curation_scores.ranking_score, photo_curation_recommendations.confidence_score, photo_curation_recommendations.confidence_label, photo_curation_scores.selection_label, photo_curation_recommendations.album_candidate, duplicate_groups.id, burst_groups.id, photo_selection_overrides.override_label
         ORDER BY COALESCE(photo_curation_scores.ranking_score, photo_quality_metrics.overall_score, 0) DESC, photos.filename ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok(SelectionCandidateRecord {
            photo_id: row.get::<_, String>(0)?,
            filename: row.get::<_, String>(1)?,
            modified_at: row.get::<_, Option<String>>(2)?,
            overall_score: row.get::<_, Option<f64>>(3)?,
            ranking_score: row.get::<_, Option<f64>>(4)?,
            confidence_score: row.get::<_, Option<f64>>(5)?,
            confidence_label: row.get::<_, Option<String>>(6)?,
            selection_label: row.get::<_, Option<String>>(7)?,
            album_candidate: row.get::<_, Option<i64>>(8)?.unwrap_or(0) != 0,
            duplicate_group_id: row.get::<_, Option<String>>(9)?,
            burst_group_id: row.get::<_, Option<String>>(10)?,
            priority_people_count: row.get::<_, i64>(11)? as u64,
            named_people_count: row.get::<_, i64>(12)? as u64,
            face_count: row.get::<_, i64>(13)? as u64,
            override_label: row.get::<_, Option<String>>(14)?,
        })
    })?;

    let mut candidates = Vec::new();
    for row in rows {
        candidates.push(row?);
    }
    Ok(candidates)
}

pub fn persist_smart_selection(
    path: &Path,
    run_id: &str,
    final_count_target: u64,
    review_count_target: u64,
    photos_total: u64,
    result: &SmartSelectionResult,
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    transaction.execute("DELETE FROM final_selection_items", [])?;
    transaction.execute("DELETE FROM selection_runs", [])?;
    transaction.execute(
        "INSERT INTO selection_runs (id, status, engine, engine_version, final_count_target, review_count_target, photos_total, selected_count, review_count, rejected_count, protected_count, started_at, ended_at)
         VALUES (?1, 'completed', 'lumoza-smart-selection-v1', ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![
            run_id,
            env!("CARGO_PKG_VERSION"),
            final_count_target as i64,
            review_count_target as i64,
            photos_total as i64,
            result.selected_count as i64,
            result.review_count as i64,
            result.rejected_count as i64,
            result.protected_count as i64,
            now.as_str(),
        ],
    )?;

    let mut statement = transaction.prepare(
        "INSERT INTO final_selection_items (run_id, photo_id, selection_bucket, final_rank, selection_score, quality_score, people_score, diversity_score, confidence_score, explanation, coverage_reason, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
    )?;
    for item in &result.items {
        statement.execute(params![
            run_id,
            item.photo_id.as_str(),
            item.selection_bucket.as_str(),
            item.final_rank as i64,
            item.selection_score,
            item.quality_score,
            item.people_score,
            item.diversity_score,
            item.confidence_score,
            item.explanation.as_str(),
            item.coverage_reason.as_str(),
            now.as_str(),
        ])?;
    }
    drop(statement);

    transaction.execute(
        "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
         VALUES (?1, 'smart_selection_completed', 'info', ?2, ?3, ?4)",
        params![
            format!("selection-run-{run_id}"),
            format!(
                "Built final selection with {} final memories, {} review items, and {} rejected candidates.",
                result.selected_count, result.review_count, result.rejected_count,
            ),
            format!(
                r#"{{"finalCount": {}, "reviewCount": {}, "rejectedCount": {}, "protectedCount": {}}}"#,
                result.selected_count, result.review_count, result.rejected_count, result.protected_count,
            ),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;
    Ok(())
}

pub fn get_selection_summary(path: &Path) -> anyhow::Result<SelectionSummaryRecord> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let selection_run_count =
        connection.query_row("SELECT COUNT(*) FROM selection_runs", [], |row| {
            Ok(row.get::<_, i64>(0)? as u64)
        })?;
    let latest = connection
        .query_row(
            "SELECT final_count_target, review_count_target, selected_count, review_count, rejected_count, protected_count, status FROM selection_runs ORDER BY started_at DESC LIMIT 1",
            [],
            |row| {
                Ok((
                    row.get::<_, i64>(0)? as u64,
                    row.get::<_, i64>(1)? as u64,
                    row.get::<_, i64>(2)? as u64,
                    row.get::<_, i64>(3)? as u64,
                    row.get::<_, i64>(4)? as u64,
                    row.get::<_, i64>(5)? as u64,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .optional()?;

    let Some((
        final_count_target,
        review_count_target,
        selected_count,
        review_count,
        rejected_count,
        protected_count,
        last_status,
    )) = latest
    else {
        return Ok(SelectionSummaryRecord {
            selection_run_count,
            final_count_target: 300,
            review_count_target: 1000,
            selected_count: 0,
            review_count: 0,
            rejected_count: 0,
            protected_count: 0,
            last_status: None,
        });
    };

    Ok(SelectionSummaryRecord {
        selection_run_count,
        final_count_target,
        review_count_target,
        selected_count,
        review_count,
        rejected_count,
        protected_count,
        last_status: Some(last_status),
    })
}

pub fn set_photo_selection_override(
    path: &Path,
    photo_id: &str,
    override_label: &str,
    note: Option<String>,
) -> anyhow::Result<()> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let normalized = normalize_selection_override(override_label);
    let now = Utc::now().to_rfc3339();

    if normalized == "clear" {
        connection.execute(
            "DELETE FROM photo_selection_overrides WHERE photo_id = ?1",
            params![photo_id],
        )?;
        return Ok(());
    }

    connection.execute(
        "INSERT INTO photo_selection_overrides (photo_id, override_label, note, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT(photo_id) DO UPDATE SET override_label = excluded.override_label, note = excluded.note, updated_at = excluded.updated_at",
        params![photo_id, normalized.as_str(), note.as_deref(), now.as_str()],
    )?;
    Ok(())
}

fn normalize_selection_override(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "force_include" | "include" => "force_include".to_string(),
        "force_exclude" | "exclude" => "force_exclude".to_string(),
        "protect" | "protected" => "protect".to_string(),
        _ => "clear".to_string(),
    }
}

pub fn list_final_selection_photos(
    path: &Path,
    bucket: &str,
    limit: u32,
) -> anyhow::Result<Vec<ProjectPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let safe_bucket = match bucket {
        "review" => "review",
        "rejected" => "rejected",
        _ => "final",
    };
    let safe_limit = limit.clamp(1, 1000);
    let mut statement = connection.prepare(
        "WITH latest_run AS (SELECT id FROM selection_runs ORDER BY started_at DESC LIMIT 1)
         SELECT
            photos.id,
            photos.absolute_path,
            photos.filename,
            photos.extension,
            photos.file_size_bytes,
            photos.width,
            photos.height,
            photos.modified_at,
            photos.thumbnail_status,
            thumbnails.cache_path,
            photo_quality_metrics.sharpness_score,
            photo_quality_metrics.exposure_score,
            photo_quality_metrics.contrast_score,
            photo_quality_metrics.resolution_score,
            COALESCE(photo_quality_metrics.overall_score, final_selection_items.quality_score),
            duplicate_groups.id,
            burst_groups.id,
            final_selection_items.selection_score,
            CASE final_selection_items.selection_bucket WHEN 'final' THEN 'keep' WHEN 'review' THEN 'review' ELSE 'reject' END,
            final_selection_items.explanation,
            final_selection_items.confidence_score,
            CASE WHEN final_selection_items.confidence_score >= 0.72 THEN 'high' WHEN final_selection_items.confidence_score >= 0.50 THEN 'medium' ELSE 'low' END,
            CASE final_selection_items.selection_bucket WHEN 'final' THEN 1 ELSE 0 END
         FROM final_selection_items
         JOIN latest_run ON latest_run.id = final_selection_items.run_id
         JOIN photos ON photos.id = final_selection_items.photo_id
         LEFT JOIN thumbnails ON thumbnails.photo_id = photos.id
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
         LEFT JOIN duplicate_group_members AS duplicate_members ON duplicate_members.photo_id = photos.id
         LEFT JOIN duplicate_groups ON duplicate_groups.id = duplicate_members.group_id AND duplicate_groups.grouping_type = 'duplicate'
         LEFT JOIN duplicate_group_members AS burst_members ON burst_members.photo_id = photos.id
         LEFT JOIN duplicate_groups AS burst_groups ON burst_groups.id = burst_members.group_id AND burst_groups.grouping_type = 'burst'
         WHERE final_selection_items.selection_bucket = ?1
         ORDER BY final_selection_items.final_rank ASC
         LIMIT ?2",
    )?;

    let rows = statement.query_map(params![safe_bucket, safe_limit as i64], |row| {
        Ok(ProjectPhotoRecord {
            id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
            filename: row.get::<_, String>(2)?,
            extension: row.get::<_, String>(3)?,
            file_size_bytes: row.get::<_, i64>(4)? as u64,
            width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
            height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
            modified_at: row.get::<_, Option<String>>(7)?,
            thumbnail_status: row.get::<_, String>(8)?,
            thumbnail_cache_path: row.get::<_, Option<String>>(9)?,
            sharpness_score: row.get::<_, Option<f64>>(10)?,
            exposure_score: row.get::<_, Option<f64>>(11)?,
            contrast_score: row.get::<_, Option<f64>>(12)?,
            resolution_score: row.get::<_, Option<f64>>(13)?,
            overall_score: row.get::<_, Option<f64>>(14)?,
            duplicate_group_id: row.get::<_, Option<String>>(15)?,
            burst_group_id: row.get::<_, Option<String>>(16)?,
            ranking_score: row.get::<_, Option<f64>>(17)?,
            selection_label: row.get::<_, Option<String>>(18)?,
            selection_reason: row.get::<_, Option<String>>(19)?,
            confidence_score: row.get::<_, Option<f64>>(20)?,
            confidence_label: row.get::<_, Option<String>>(21)?,
            album_candidate: row.get::<_, Option<i64>>(22)?.unwrap_or(0) != 0,
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }
    Ok(photos)
}

pub fn list_project_photos(
    path: &Path,
    offset: u32,
    limit: u32,
) -> anyhow::Result<Vec<ProjectPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let mut statement = connection.prepare(
        "SELECT
            photos.id,
            photos.absolute_path,
            photos.filename,
            photos.extension,
            photos.file_size_bytes,
            photos.width,
            photos.height,
            photos.modified_at,
            photos.thumbnail_status,
            thumbnails.cache_path,
            photo_quality_metrics.sharpness_score,
            photo_quality_metrics.exposure_score,
            photo_quality_metrics.contrast_score,
            photo_quality_metrics.resolution_score,
            photo_quality_metrics.overall_score,
            duplicate_groups.id,
            burst_groups.id,
            photo_curation_scores.ranking_score,
            photo_curation_scores.selection_label,
            photo_curation_scores.selection_reason,
            photo_curation_recommendations.confidence_score,
            photo_curation_recommendations.confidence_label,
            photo_curation_recommendations.album_candidate
         FROM photos
         LEFT JOIN thumbnails ON thumbnails.photo_id = photos.id
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
         LEFT JOIN photo_curation_scores ON photo_curation_scores.photo_id = photos.id
         LEFT JOIN photo_curation_recommendations ON photo_curation_recommendations.photo_id = photos.id
         LEFT JOIN duplicate_group_members AS duplicate_members ON duplicate_members.photo_id = photos.id
         LEFT JOIN duplicate_groups ON duplicate_groups.id = duplicate_members.group_id AND duplicate_groups.grouping_type = 'duplicate'
         LEFT JOIN duplicate_group_members AS burst_members ON burst_members.photo_id = photos.id
         LEFT JOIN duplicate_groups AS burst_groups ON burst_groups.id = burst_members.group_id AND burst_groups.grouping_type = 'burst'
         ORDER BY COALESCE(photos.modified_at, '') DESC, photos.filename ASC
         LIMIT ?1 OFFSET ?2",
    )?;

    let rows = statement.query_map(params![limit as i64, offset as i64], |row| {
        Ok(ProjectPhotoRecord {
            id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
            filename: row.get::<_, String>(2)?,
            extension: row.get::<_, String>(3)?,
            file_size_bytes: row.get::<_, i64>(4)? as u64,
            width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
            height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
            modified_at: row.get::<_, Option<String>>(7)?,
            thumbnail_status: row.get::<_, String>(8)?,
            thumbnail_cache_path: row.get::<_, Option<String>>(9)?,
            sharpness_score: row.get::<_, Option<f64>>(10)?,
            exposure_score: row.get::<_, Option<f64>>(11)?,
            contrast_score: row.get::<_, Option<f64>>(12)?,
            resolution_score: row.get::<_, Option<f64>>(13)?,
            overall_score: row.get::<_, Option<f64>>(14)?,
            duplicate_group_id: row.get::<_, Option<String>>(15)?,
            burst_group_id: row.get::<_, Option<String>>(16)?,
            ranking_score: row.get::<_, Option<f64>>(17)?,
            selection_label: row.get::<_, Option<String>>(18)?,
            selection_reason: row.get::<_, Option<String>>(19)?,
            confidence_score: row.get::<_, Option<f64>>(20)?,
            confidence_label: row.get::<_, Option<String>>(21)?,
            album_candidate: row.get::<_, Option<i64>>(22)?.unwrap_or(0) != 0,
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }

    Ok(photos)
}

pub fn list_album_candidate_photos(
    path: &Path,
    limit: u32,
) -> anyhow::Result<Vec<ProjectPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let safe_limit = limit.clamp(1, 60);
    let mut statement = connection.prepare(
        "SELECT
            photos.id,
            photos.absolute_path,
            photos.filename,
            photos.extension,
            photos.file_size_bytes,
            photos.width,
            photos.height,
            photos.modified_at,
            photos.thumbnail_status,
            thumbnails.cache_path,
            photo_quality_metrics.sharpness_score,
            photo_quality_metrics.exposure_score,
            photo_quality_metrics.contrast_score,
            photo_quality_metrics.resolution_score,
            photo_quality_metrics.overall_score,
            duplicate_groups.id,
            burst_groups.id,
            photo_curation_scores.ranking_score,
            photo_curation_scores.selection_label,
            photo_curation_scores.selection_reason,
            photo_curation_recommendations.confidence_score,
            photo_curation_recommendations.confidence_label,
            photo_curation_recommendations.album_candidate
         FROM photos
         LEFT JOIN thumbnails ON thumbnails.photo_id = photos.id
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
         LEFT JOIN photo_curation_scores ON photo_curation_scores.photo_id = photos.id
         LEFT JOIN photo_curation_recommendations ON photo_curation_recommendations.photo_id = photos.id
         LEFT JOIN duplicate_group_members AS duplicate_members ON duplicate_members.photo_id = photos.id
         LEFT JOIN duplicate_groups ON duplicate_groups.id = duplicate_members.group_id AND duplicate_groups.grouping_type = 'duplicate'
         LEFT JOIN duplicate_group_members AS burst_members ON burst_members.photo_id = photos.id
         LEFT JOIN duplicate_groups AS burst_groups ON burst_groups.id = burst_members.group_id AND burst_groups.grouping_type = 'burst'
         WHERE photo_curation_recommendations.album_candidate = 1
         ORDER BY photo_curation_recommendations.confidence_score DESC, photo_curation_scores.ranking_score DESC, photos.filename ASC
         LIMIT ?1",
    )?;

    let rows = statement.query_map(params![safe_limit as i64], |row| {
        Ok(ProjectPhotoRecord {
            id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
            filename: row.get::<_, String>(2)?,
            extension: row.get::<_, String>(3)?,
            file_size_bytes: row.get::<_, i64>(4)? as u64,
            width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
            height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
            modified_at: row.get::<_, Option<String>>(7)?,
            thumbnail_status: row.get::<_, String>(8)?,
            thumbnail_cache_path: row.get::<_, Option<String>>(9)?,
            sharpness_score: row.get::<_, Option<f64>>(10)?,
            exposure_score: row.get::<_, Option<f64>>(11)?,
            contrast_score: row.get::<_, Option<f64>>(12)?,
            resolution_score: row.get::<_, Option<f64>>(13)?,
            overall_score: row.get::<_, Option<f64>>(14)?,
            duplicate_group_id: row.get::<_, Option<String>>(15)?,
            burst_group_id: row.get::<_, Option<String>>(16)?,
            ranking_score: row.get::<_, Option<f64>>(17)?,
            selection_label: row.get::<_, Option<String>>(18)?,
            selection_reason: row.get::<_, Option<String>>(19)?,
            confidence_score: row.get::<_, Option<f64>>(20)?,
            confidence_label: row.get::<_, Option<String>>(21)?,
            album_candidate: row.get::<_, Option<i64>>(22)?.unwrap_or(0) != 0,
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }

    Ok(photos)
}

pub fn list_review_queue_photos(
    path: &Path,
    limit: u32,
) -> anyhow::Result<Vec<ProjectPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let safe_limit = limit.clamp(1, 80);
    let mut statement = connection.prepare(
        "SELECT
            photos.id,
            photos.absolute_path,
            photos.filename,
            photos.extension,
            photos.file_size_bytes,
            photos.width,
            photos.height,
            photos.modified_at,
            photos.thumbnail_status,
            thumbnails.cache_path,
            photo_quality_metrics.sharpness_score,
            photo_quality_metrics.exposure_score,
            photo_quality_metrics.contrast_score,
            photo_quality_metrics.resolution_score,
            photo_quality_metrics.overall_score,
            duplicate_groups.id,
            burst_groups.id,
            photo_curation_scores.ranking_score,
            photo_curation_scores.selection_label,
            photo_curation_scores.selection_reason,
            photo_curation_recommendations.confidence_score,
            photo_curation_recommendations.confidence_label,
            photo_curation_recommendations.album_candidate
         FROM photos
         LEFT JOIN thumbnails ON thumbnails.photo_id = photos.id
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
         LEFT JOIN photo_curation_scores ON photo_curation_scores.photo_id = photos.id
         LEFT JOIN photo_curation_recommendations ON photo_curation_recommendations.photo_id = photos.id
         LEFT JOIN duplicate_group_members AS duplicate_members ON duplicate_members.photo_id = photos.id
         LEFT JOIN duplicate_groups ON duplicate_groups.id = duplicate_members.group_id AND duplicate_groups.grouping_type = 'duplicate'
         LEFT JOIN duplicate_group_members AS burst_members ON burst_members.photo_id = photos.id
         LEFT JOIN duplicate_groups AS burst_groups ON burst_groups.id = burst_members.group_id AND burst_groups.grouping_type = 'burst'
         WHERE photo_curation_scores.selection_label = 'review'
            OR photo_curation_recommendations.confidence_label IN ('medium', 'low')
         ORDER BY
            CASE photo_curation_scores.selection_label WHEN 'review' THEN 0 ELSE 1 END,
            photo_curation_recommendations.confidence_score ASC,
            photo_curation_scores.ranking_score DESC,
            photos.filename ASC
         LIMIT ?1",
    )?;

    let rows = statement.query_map(params![safe_limit as i64], |row| {
        Ok(ProjectPhotoRecord {
            id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
            filename: row.get::<_, String>(2)?,
            extension: row.get::<_, String>(3)?,
            file_size_bytes: row.get::<_, i64>(4)? as u64,
            width: row.get::<_, Option<i64>>(5)?.map(|value| value as u32),
            height: row.get::<_, Option<i64>>(6)?.map(|value| value as u32),
            modified_at: row.get::<_, Option<String>>(7)?,
            thumbnail_status: row.get::<_, String>(8)?,
            thumbnail_cache_path: row.get::<_, Option<String>>(9)?,
            sharpness_score: row.get::<_, Option<f64>>(10)?,
            exposure_score: row.get::<_, Option<f64>>(11)?,
            contrast_score: row.get::<_, Option<f64>>(12)?,
            resolution_score: row.get::<_, Option<f64>>(13)?,
            overall_score: row.get::<_, Option<f64>>(14)?,
            duplicate_group_id: row.get::<_, Option<String>>(15)?,
            burst_group_id: row.get::<_, Option<String>>(16)?,
            ranking_score: row.get::<_, Option<f64>>(17)?,
            selection_label: row.get::<_, Option<String>>(18)?,
            selection_reason: row.get::<_, Option<String>>(19)?,
            confidence_score: row.get::<_, Option<f64>>(20)?,
            confidence_label: row.get::<_, Option<String>>(21)?,
            album_candidate: row.get::<_, Option<i64>>(22)?.unwrap_or(0) != 0,
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }

    Ok(photos)
}

pub fn list_curation_group_summaries(
    path: &Path,
    limit: u32,
) -> anyhow::Result<Vec<CurationGroupSummaryRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let safe_limit = limit.clamp(1, 80);
    let mut statement = connection.prepare(
        "SELECT
            duplicate_groups.id,
            duplicate_groups.grouping_type,
            COUNT(group_members.photo_id) AS member_count,
            best_member.photo_id,
            photos.filename,
            AVG(group_members.similarity_score)
         FROM duplicate_groups
         JOIN duplicate_group_members AS group_members ON group_members.group_id = duplicate_groups.id
         LEFT JOIN duplicate_group_members AS best_member ON best_member.group_id = duplicate_groups.id AND best_member.rank_order = 0
         LEFT JOIN photos ON photos.id = best_member.photo_id
         GROUP BY duplicate_groups.id, duplicate_groups.grouping_type, best_member.photo_id, photos.filename
         ORDER BY
            CASE duplicate_groups.grouping_type WHEN 'duplicate' THEN 0 ELSE 1 END,
            member_count DESC,
            AVG(group_members.similarity_score) DESC,
            photos.filename ASC
         LIMIT ?1",
    )?;

    let rows = statement.query_map(params![safe_limit as i64], |row| {
        Ok(CurationGroupSummaryRecord {
            group_id: row.get::<_, String>(0)?,
            grouping_type: row.get::<_, String>(1)?,
            member_count: row.get::<_, i64>(2)? as u64,
            best_photo_id: row.get::<_, Option<String>>(3)?,
            best_filename: row.get::<_, Option<String>>(4)?,
            average_similarity: row.get::<_, Option<f64>>(5)?,
        })
    })?;

    let mut groups = Vec::new();
    for row in rows {
        groups.push(row?);
    }

    Ok(groups)
}

pub fn get_project_analysis_summary(path: &Path) -> anyhow::Result<ProjectAnalysisSummaryRecord> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;

    let analyzed_photo_count =
        connection.query_row("SELECT COUNT(*) FROM photo_quality_metrics", [], |row| {
            Ok(row.get::<_, i64>(0)? as u64)
        })?;

    let average_overall_score = connection.query_row(
        "SELECT AVG(overall_score) FROM photo_quality_metrics",
        [],
        |row| row.get::<_, Option<f64>>(0),
    )?;

    let duplicate_group_count = connection.query_row(
        "SELECT COUNT(*) FROM duplicate_groups WHERE grouping_type = 'duplicate'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let burst_group_count = connection.query_row(
        "SELECT COUNT(*) FROM duplicate_groups WHERE grouping_type = 'burst'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let keep_count = connection.query_row(
        "SELECT COUNT(*) FROM photo_curation_scores WHERE selection_label = 'keep'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let review_count = connection.query_row(
        "SELECT COUNT(*) FROM photo_curation_scores WHERE selection_label = 'review'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let reject_count = connection.query_row(
        "SELECT COUNT(*) FROM photo_curation_scores WHERE selection_label = 'reject'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let high_confidence_count = connection.query_row(
        "SELECT COUNT(*) FROM photo_curation_recommendations WHERE confidence_label = 'high'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let album_candidate_count = connection.query_row(
        "SELECT COUNT(*) FROM photo_curation_recommendations WHERE album_candidate = 1",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    Ok(ProjectAnalysisSummaryRecord {
        analyzed_photo_count,
        average_overall_score,
        duplicate_group_count,
        burst_group_count,
        keep_count,
        review_count,
        reject_count,
        high_confidence_count,
        album_candidate_count,
    })
}

pub fn persist_people_analysis(
    path: &Path,
    analysis_run_id: &str,
    photos_total: u64,
    result: &PeopleAnalysisResult,
    cancelled: bool,
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    transaction.execute("DELETE FROM person_faces", [])?;
    transaction.execute("DELETE FROM people_clusters", [])?;
    transaction.execute("DELETE FROM face_detections", [])?;
    transaction.execute("DELETE FROM face_analysis_runs", [])?;

    transaction.execute(
        "INSERT INTO face_analysis_runs (id, status, engine, engine_version, photos_total, photos_processed, faces_detected, people_clustered, started_at, ended_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            analysis_run_id,
            if cancelled { "cancelled" } else { "completed" },
            "lumoza-rust-cpu-face-candidate-v1",
            env!("CARGO_PKG_VERSION"),
            photos_total as i64,
            (photos_total.saturating_sub(result.failed_photo_ids.len() as u64)) as i64,
            result.detections.len() as i64,
            result.clusters.len() as i64,
            now.as_str(),
            now.as_str(),
        ],
    )?;

    persist_face_detection_records(&transaction, analysis_run_id, &result.detections, &now)?;
    persist_people_cluster_records(&transaction, &result.clusters, &now)?;

    transaction.execute(
        "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            format!("people-analysis-run-{analysis_run_id}"),
            "people_analysis_completed",
            if result.failed_photo_ids.is_empty() { "info" } else { "warning" },
            format!(
                "Prepared people intelligence for {} photos, detected {} face candidates, and organized {} people groups.",
                photos_total,
                result.detections.len(),
                result.clusters.len(),
            ),
            format!(
                r#"{{"failedCount": {}, "facesDetected": {}, "peopleClustered": {}}}"#,
                result.failed_photo_ids.len(),
                result.detections.len(),
                result.clusters.len(),
            ),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;
    Ok(())
}

fn persist_face_detection_records(
    transaction: &Transaction<'_>,
    analysis_run_id: &str,
    detections: &[FaceDetectionRecord],
    now: &str,
) -> anyhow::Result<()> {
    let mut statement = transaction.prepare(
        "INSERT INTO face_detections (
            id,
            photo_id,
            analysis_run_id,
            bounding_box_x,
            bounding_box_y,
            bounding_box_width,
            bounding_box_height,
            detection_confidence,
            quality_score,
            crop_cache_path,
            embedding_model,
            embedding_vector_json,
            created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
    )?;

    for detection in detections {
        statement.execute(params![
            detection.id.as_str(),
            detection.photo_id.as_str(),
            analysis_run_id,
            detection.bounding_box_x,
            detection.bounding_box_y,
            detection.bounding_box_width,
            detection.bounding_box_height,
            detection.detection_confidence,
            detection.quality_score,
            detection.crop_cache_path.as_deref(),
            detection.embedding_model.as_str(),
            detection.embedding_vector_json.as_str(),
            now,
        ])?;
    }

    Ok(())
}

fn persist_people_cluster_records(
    transaction: &Transaction<'_>,
    clusters: &[PeopleClusterRecord],
    now: &str,
) -> anyhow::Result<()> {
    let mut cluster_statement = transaction.prepare(
        "INSERT INTO people_clusters (id, display_name, representative_face_id, face_count, photo_count, priority_label, is_hidden, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
    )?;
    let mut face_statement = transaction.prepare(
        "INSERT INTO person_faces (person_id, face_detection_id, cluster_confidence, is_representative)
         VALUES (?1, ?2, ?3, ?4)",
    )?;

    for cluster in clusters {
        cluster_statement.execute(params![
            cluster.id.as_str(),
            cluster.display_name.as_deref(),
            cluster.representative_face_id.as_deref(),
            cluster.face_count as i64,
            cluster.photo_count as i64,
            cluster.priority_label.as_str(),
            if cluster.is_hidden { 1_i64 } else { 0_i64 },
            now,
            now,
        ])?;
        for face in &cluster.faces {
            face_statement.execute(params![
                face.person_id.as_str(),
                face.face_detection_id.as_str(),
                face.cluster_confidence,
                if face.is_representative { 1_i64 } else { 0_i64 },
            ])?;
        }
    }

    Ok(())
}

pub fn list_project_people(path: &Path) -> anyhow::Result<Vec<ProjectPersonRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let mut statement = connection.prepare(
        "SELECT p.id, p.display_name, p.representative_face_id, f.crop_cache_path, p.face_count, p.photo_count, p.priority_label, p.is_hidden
         FROM people_clusters p
         LEFT JOIN face_detections f ON f.id = p.representative_face_id
         WHERE p.is_hidden = 0
         ORDER BY CASE p.priority_label
             WHEN 'p1' THEN 1 WHEN 'p2' THEN 2 WHEN 'p3' THEN 3 WHEN 'p4' THEN 4 WHEN 'p5' THEN 5 ELSE 9 END,
             p.face_count DESC,
             COALESCE(p.display_name, p.id) ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok(ProjectPersonRecord {
            id: row.get::<_, String>(0)?,
            display_name: row.get::<_, Option<String>>(1)?,
            representative_face_id: row.get::<_, Option<String>>(2)?,
            representative_crop_cache_path: row.get::<_, Option<String>>(3)?,
            face_count: row.get::<_, i64>(4)? as u64,
            photo_count: row.get::<_, i64>(5)? as u64,
            priority_label: row.get::<_, String>(6)?,
            is_hidden: row.get::<_, i64>(7)? != 0,
            faces: Vec::new(),
        })
    })?;

    let mut people = Vec::new();
    for row in rows {
        let mut person = row?;
        person.faces = list_person_faces(&connection, &person.id, 12)?;
        people.push(person);
    }

    Ok(people)
}

fn list_person_faces(
    connection: &Connection,
    person_id: &str,
    limit: u32,
) -> anyhow::Result<Vec<ProjectPersonFaceRecord>> {
    let mut statement = connection.prepare(
        "SELECT f.id, f.photo_id, photos.filename, f.crop_cache_path, f.bounding_box_x, f.bounding_box_y, f.bounding_box_width, f.bounding_box_height, f.detection_confidence, f.quality_score, pf.is_representative
         FROM person_faces pf
         JOIN face_detections f ON f.id = pf.face_detection_id
         LEFT JOIN photos ON photos.id = f.photo_id
         WHERE pf.person_id = ?1
         ORDER BY pf.is_representative DESC, f.quality_score DESC, f.detection_confidence DESC
         LIMIT ?2",
    )?;

    let rows = statement.query_map(params![person_id, limit as i64], |row| {
        Ok(ProjectPersonFaceRecord {
            id: row.get::<_, String>(0)?,
            photo_id: row.get::<_, String>(1)?,
            filename: row.get::<_, Option<String>>(2)?,
            crop_cache_path: row.get::<_, Option<String>>(3)?,
            bounding_box_x: row.get::<_, f64>(4)?,
            bounding_box_y: row.get::<_, f64>(5)?,
            bounding_box_width: row.get::<_, f64>(6)?,
            bounding_box_height: row.get::<_, f64>(7)?,
            detection_confidence: row.get::<_, f64>(8)?,
            quality_score: row.get::<_, f64>(9)?,
            is_representative: row.get::<_, i64>(10)? != 0,
        })
    })?;

    let mut faces = Vec::new();
    for row in rows {
        faces.push(row?);
    }
    Ok(faces)
}

pub fn update_project_person(
    path: &Path,
    person_id: &str,
    display_name: Option<String>,
    priority_label: Option<String>,
    is_hidden: Option<bool>,
) -> anyhow::Result<()> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let now = Utc::now().to_rfc3339();

    if let Some(name) = display_name {
        let cleaned = name.trim();
        let value = if cleaned.is_empty() {
            None
        } else {
            Some(cleaned)
        };
        connection.execute(
            "UPDATE people_clusters SET display_name = ?1, updated_at = ?2 WHERE id = ?3",
            params![value, now.as_str(), person_id],
        )?;
    }
    if let Some(priority) = priority_label {
        let normalized = normalize_priority_label(&priority);
        connection.execute(
            "UPDATE people_clusters SET priority_label = ?1, updated_at = ?2 WHERE id = ?3",
            params![normalized.as_str(), now.as_str(), person_id],
        )?;
    }
    if let Some(hidden) = is_hidden {
        connection.execute(
            "UPDATE people_clusters SET is_hidden = ?1, updated_at = ?2 WHERE id = ?3",
            params![if hidden { 1_i64 } else { 0_i64 }, now.as_str(), person_id],
        )?;
    }

    Ok(())
}

pub fn merge_project_people(
    path: &Path,
    primary_person_id: &str,
    secondary_person_id: &str,
) -> anyhow::Result<()> {
    if primary_person_id == secondary_person_id {
        return Ok(());
    }
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    transaction.execute(
        "INSERT OR IGNORE INTO person_faces (person_id, face_detection_id, cluster_confidence, is_representative)
         SELECT ?1, face_detection_id, cluster_confidence, 0 FROM person_faces WHERE person_id = ?2",
        params![primary_person_id, secondary_person_id],
    )?;
    transaction.execute(
        "DELETE FROM people_clusters WHERE id = ?1",
        params![secondary_person_id],
    )?;
    recompute_person_cluster(&transaction, primary_person_id, &now)?;
    transaction.commit()?;
    Ok(())
}

pub fn split_project_person_face(
    path: &Path,
    face_detection_id: &str,
    display_name: Option<String>,
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();
    let old_person_id: String = transaction.query_row(
        "SELECT person_id FROM person_faces WHERE face_detection_id = ?1 LIMIT 1",
        params![face_detection_id],
        |row| row.get(0),
    )?;
    let new_person_id = format!("person:{}", uuid::Uuid::new_v4());
    let cleaned_name = display_name.and_then(|name| {
        let trimmed = name.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });

    transaction.execute(
        "INSERT INTO people_clusters (id, display_name, representative_face_id, face_count, photo_count, priority_label, is_hidden, created_at, updated_at)
         VALUES (?1, ?2, ?3, 1, 1, 'unassigned', 0, ?4, ?4)",
        params![new_person_id.as_str(), cleaned_name.as_deref(), face_detection_id, now.as_str()],
    )?;
    transaction.execute(
        "DELETE FROM person_faces WHERE person_id = ?1 AND face_detection_id = ?2",
        params![old_person_id.as_str(), face_detection_id],
    )?;
    transaction.execute(
        "INSERT INTO person_faces (person_id, face_detection_id, cluster_confidence, is_representative)
         VALUES (?1, ?2, 1.0, 1)",
        params![new_person_id.as_str(), face_detection_id],
    )?;
    recompute_or_delete_person_cluster(&transaction, old_person_id.as_str(), &now)?;
    transaction.commit()?;
    Ok(())
}

fn normalize_priority_label(value: &str) -> String {
    match value.trim().to_ascii_lowercase().as_str() {
        "p1" | "bride" | "groom" => "p1".to_string(),
        "p2" | "parents" => "p2".to_string(),
        "p3" | "siblings" => "p3".to_string(),
        "p4" | "close" | "family" => "p4".to_string(),
        "p5" | "guests" => "p5".to_string(),
        _ => "unassigned".to_string(),
    }
}

fn recompute_or_delete_person_cluster(
    transaction: &Transaction<'_>,
    person_id: &str,
    now: &str,
) -> anyhow::Result<()> {
    let face_count: i64 = transaction.query_row(
        "SELECT COUNT(*) FROM person_faces WHERE person_id = ?1",
        params![person_id],
        |row| row.get(0),
    )?;
    if face_count == 0 {
        transaction.execute(
            "DELETE FROM people_clusters WHERE id = ?1",
            params![person_id],
        )?;
        return Ok(());
    }
    recompute_person_cluster(transaction, person_id, now)
}

fn recompute_person_cluster(
    transaction: &Transaction<'_>,
    person_id: &str,
    now: &str,
) -> anyhow::Result<()> {
    let representative_face_id: Option<String> = transaction.query_row(
        "SELECT f.id FROM person_faces pf JOIN face_detections f ON f.id = pf.face_detection_id WHERE pf.person_id = ?1 ORDER BY pf.is_representative DESC, f.quality_score DESC, f.detection_confidence DESC LIMIT 1",
        params![person_id],
        |row| row.get(0),
    )?;
    let face_count: i64 = transaction.query_row(
        "SELECT COUNT(*) FROM person_faces WHERE person_id = ?1",
        params![person_id],
        |row| row.get(0),
    )?;
    let photo_count: i64 = transaction.query_row(
        "SELECT COUNT(DISTINCT f.photo_id) FROM person_faces pf JOIN face_detections f ON f.id = pf.face_detection_id WHERE pf.person_id = ?1",
        params![person_id],
        |row| row.get(0),
    )?;
    transaction.execute(
        "UPDATE person_faces SET is_representative = CASE WHEN face_detection_id = ?1 THEN 1 ELSE 0 END WHERE person_id = ?2",
        params![representative_face_id.as_deref(), person_id],
    )?;
    transaction.execute(
        "UPDATE people_clusters SET representative_face_id = ?1, face_count = ?2, photo_count = ?3, updated_at = ?4 WHERE id = ?5",
        params![representative_face_id.as_deref(), face_count, photo_count, now, person_id],
    )?;
    Ok(())
}

pub fn get_project_people_summary(path: &Path) -> anyhow::Result<ProjectPeopleSummaryRecord> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;

    let face_analysis_run_count =
        connection.query_row("SELECT COUNT(*) FROM face_analysis_runs", [], |row| {
            Ok(row.get::<_, i64>(0)? as u64)
        })?;

    let detected_face_count =
        connection.query_row("SELECT COUNT(*) FROM face_detections", [], |row| {
            Ok(row.get::<_, i64>(0)? as u64)
        })?;

    let clustered_people_count = connection.query_row(
        "SELECT COUNT(*) FROM people_clusters WHERE is_hidden = 0",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let named_people_count = connection.query_row(
        "SELECT COUNT(*) FROM people_clusters WHERE is_hidden = 0 AND display_name IS NOT NULL AND TRIM(display_name) != ''",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let priority_people_count = connection.query_row(
        "SELECT COUNT(*) FROM people_clusters WHERE is_hidden = 0 AND priority_label != 'unassigned'",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let unassigned_face_count = connection.query_row(
        "SELECT COUNT(*) FROM face_detections WHERE id NOT IN (SELECT face_detection_id FROM person_faces)",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    let photos_with_faces_count = connection.query_row(
        "SELECT COUNT(DISTINCT photo_id) FROM face_detections",
        [],
        |row| Ok(row.get::<_, i64>(0)? as u64),
    )?;

    Ok(ProjectPeopleSummaryRecord {
        face_analysis_run_count,
        detected_face_count,
        clustered_people_count,
        named_people_count,
        priority_people_count,
        unassigned_face_count,
        photos_with_faces_count,
    })
}

pub fn list_analysis_photo_records(path: &Path) -> anyhow::Result<Vec<AnalysisPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let mut statement = connection.prepare(
        "SELECT id, absolute_path, filename, modified_at, file_size_bytes FROM photos ORDER BY COALESCE(modified_at, '') DESC, filename ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok(AnalysisPhotoRecord {
            photo_id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
            filename: row.get::<_, String>(2)?,
            modified_at: row.get::<_, Option<String>>(3)?,
            file_size_bytes: row.get::<_, i64>(4)? as u64,
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }

    Ok(photos)
}

pub fn persist_quality_analysis(
    path: &Path,
    analysis_run_id: &str,
    metrics: &[PhotoQualityMetricsRecord],
    duplicate_groups: &[PhotoGroupingRecord],
    burst_groups: &[PhotoGroupingRecord],
    curation_scores: &[PhotoCurationScoreRecord],
    failed_count: u64,
    cancelled: bool,
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    transaction.execute("DELETE FROM duplicate_group_members", [])?;
    transaction.execute("DELETE FROM duplicate_groups", [])?;
    transaction.execute("DELETE FROM photo_curation_recommendations", [])?;
    transaction.execute("DELETE FROM photo_curation_scores", [])?;

    transaction.execute(
        "INSERT INTO analysis_runs (id, analysis_type, status, engine, engine_version, photos_total, photos_processed, failed_count, started_at, ended_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            analysis_run_id,
            "technical_quality",
            if cancelled { "cancelled" } else { "completed" },
            "rust-native-fast-path",
            env!("CARGO_PKG_VERSION"),
            (metrics.len() as u64 + failed_count) as i64,
            metrics.len() as i64,
            failed_count as i64,
            now.as_str(),
            now.as_str(),
        ],
    )?;

    {
        let mut statement = transaction.prepare(
            "INSERT INTO photo_quality_metrics (
                photo_id,
                analysis_run_id,
                sharpness_score,
                exposure_score,
                contrast_score,
                resolution_score,
                overall_score,
                analyzed_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(photo_id) DO UPDATE SET
               analysis_run_id = excluded.analysis_run_id,
               sharpness_score = excluded.sharpness_score,
               exposure_score = excluded.exposure_score,
               contrast_score = excluded.contrast_score,
               resolution_score = excluded.resolution_score,
               overall_score = excluded.overall_score,
               analyzed_at = excluded.analyzed_at",
        )?;

        for metric in metrics {
            statement.execute(params![
                metric.photo_id.as_str(),
                analysis_run_id,
                metric.sharpness_score,
                metric.exposure_score,
                metric.contrast_score,
                metric.resolution_score,
                metric.overall_score,
                now.as_str(),
            ])?;
        }
    }

    persist_group_records(
        &transaction,
        analysis_run_id,
        duplicate_groups,
        "duplicate",
        &now,
    )?;
    persist_group_records(&transaction, analysis_run_id, burst_groups, "burst", &now)?;

    {
        let mut score_statement = transaction.prepare(
            "INSERT INTO photo_curation_scores (
                photo_id,
                analysis_run_id,
                ranking_score,
                selection_label,
                selection_reason,
                duplicate_penalty,
                burst_penalty,
                created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(photo_id) DO UPDATE SET
               analysis_run_id = excluded.analysis_run_id,
               ranking_score = excluded.ranking_score,
               selection_label = excluded.selection_label,
               selection_reason = excluded.selection_reason,
               duplicate_penalty = excluded.duplicate_penalty,
               burst_penalty = excluded.burst_penalty,
               created_at = excluded.created_at",
        )?;
        let mut recommendation_statement = transaction.prepare(
            "INSERT INTO photo_curation_recommendations (
                photo_id,
                analysis_run_id,
                confidence_score,
                confidence_label,
                album_candidate,
                created_at
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(photo_id) DO UPDATE SET
               analysis_run_id = excluded.analysis_run_id,
               confidence_score = excluded.confidence_score,
               confidence_label = excluded.confidence_label,
               album_candidate = excluded.album_candidate,
               created_at = excluded.created_at",
        )?;

        for score in curation_scores {
            score_statement.execute(params![
                score.photo_id.as_str(),
                analysis_run_id,
                score.ranking_score,
                score.selection_label.as_str(),
                score.selection_reason.as_str(),
                score.duplicate_penalty,
                score.burst_penalty,
                now.as_str(),
            ])?;
            recommendation_statement.execute(params![
                score.photo_id.as_str(),
                analysis_run_id,
                score.confidence_score,
                score.confidence_label.as_str(),
                if score.album_candidate { 1_i64 } else { 0_i64 },
                now.as_str(),
            ])?;
        }
    }

    transaction.execute(
        "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            format!("analysis-run-{analysis_run_id}"),
            "quality_analysis_completed",
            if failed_count > 0 { "warning" } else { "info" },
            format!(
                "Analyzed {} photos, found {} duplicate groups, {} burst groups, ranked {} keep / {} review / {} reject decisions, and marked {} album candidates.",
                metrics.len(),
                duplicate_groups.len(),
                burst_groups.len(),
                curation_scores.iter().filter(|score| score.selection_label == "keep").count(),
                curation_scores.iter().filter(|score| score.selection_label == "review").count(),
                curation_scores.iter().filter(|score| score.selection_label == "reject").count(),
                curation_scores.iter().filter(|score| score.album_candidate).count(),
            ),
            format!(
                r#"{{"failedCount": {}, "analyzedCount": {}, "duplicateGroupCount": {}, "burstGroupCount": {}, "keepCount": {}, "reviewCount": {}, "rejectCount": {}, "highConfidenceCount": {}, "albumCandidateCount": {}}}"#,
                failed_count,
                metrics.len(),
                duplicate_groups.len(),
                burst_groups.len(),
                curation_scores.iter().filter(|score| score.selection_label == "keep").count(),
                curation_scores.iter().filter(|score| score.selection_label == "review").count(),
                curation_scores.iter().filter(|score| score.selection_label == "reject").count(),
                curation_scores.iter().filter(|score| score.confidence_label == "high").count(),
                curation_scores.iter().filter(|score| score.album_candidate).count(),
            ),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;
    Ok(())
}

fn persist_group_records(
    transaction: &Transaction<'_>,
    analysis_run_id: &str,
    groups: &[PhotoGroupingRecord],
    grouping_type: &str,
    now: &str,
) -> anyhow::Result<()> {
    let mut group_statement = transaction.prepare(
        "INSERT INTO duplicate_groups (id, analysis_run_id, grouping_type, created_at) VALUES (?1, ?2, ?3, ?4)",
    )?;
    let mut member_statement = transaction.prepare(
        "INSERT INTO duplicate_group_members (group_id, photo_id, similarity_score, rank_order) VALUES (?1, ?2, ?3, ?4)",
    )?;

    for (index, group) in groups.iter().enumerate() {
        let group_id = format!("{}:{}:{}", grouping_type, analysis_run_id, index);
        group_statement.execute(params![
            group_id.as_str(),
            analysis_run_id,
            grouping_type,
            now
        ])?;
        for member in &group.members {
            member_statement.execute(params![
                group_id.as_str(),
                member.photo_id.as_str(),
                member.similarity_score,
                member.rank_order,
            ])?;
        }
        let _ = &group.grouping_type;
    }

    Ok(())
}

pub fn persist_thumbnail_updates(
    path: &Path,
    generated: &[GeneratedThumbnail],
    failed_photo_ids: &[String],
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    {
        let mut thumbnail_statement = transaction.prepare(
            "INSERT INTO thumbnails (id, photo_id, cache_path, width, height, generated_at, generation_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
               cache_path = excluded.cache_path,
               width = excluded.width,
               height = excluded.height,
               generated_at = excluded.generated_at,
               generation_status = excluded.generation_status",
        )?;

        let mut photo_statement = transaction.prepare(
            "UPDATE photos SET width = ?2, height = ?3, thumbnail_status = ?4 WHERE id = ?1",
        )?;

        for record in generated {
            thumbnail_statement.execute(params![
                format!("thumb:{}", record.photo_id),
                record.photo_id.as_str(),
                record.cache_path.as_str(),
                record.thumbnail_width as i64,
                record.thumbnail_height as i64,
                now.as_str(),
                "generated",
            ])?;
            photo_statement.execute(params![
                record.photo_id.as_str(),
                record.original_width as i64,
                record.original_height as i64,
                "generated",
            ])?;
        }
    }

    {
        let mut failed_statement =
            transaction.prepare("UPDATE photos SET thumbnail_status = 'failed' WHERE id = ?1")?;
        for photo_id in failed_photo_ids {
            failed_statement.execute(params![photo_id.as_str()])?;
        }
    }

    if !generated.is_empty() || !failed_photo_ids.is_empty() {
        transaction.execute(
            "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                format!("thumb-update-{}", now),
                "thumbnails_generated",
                if failed_photo_ids.is_empty() {
                    "info"
                } else {
                    "warning"
                },
                format!(
                    "Generated {} thumbnails and skipped {} unsupported or unreadable files.",
                    generated.len(),
                    failed_photo_ids.len()
                ),
                format!(
                    r#"{{"generatedCount": {}, "failedCount": {}}}"#,
                    generated.len(),
                    failed_photo_ids.len()
                ),
                now.as_str(),
            ],
        )?;
    }

    transaction.commit()?;
    Ok(())
}

fn open_connection(path: &Path) -> anyhow::Result<Connection> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let connection =
        Connection::open(path).with_context(|| format!("failed to open {}", path.display()))?;
    connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    Ok(connection)
}

fn apply_migrations(connection: &Connection, path: &Path) -> anyhow::Result<()> {
    for migration in MIGRATIONS {
        connection
            .execute_batch(migration)
            .with_context(|| format!("failed to apply migrations to {}", path.display()))?;
    }
    Ok(())
}

fn upsert_project(
    transaction: &Transaction<'_>,
    project: &ProjectSummary,
    now: &str,
) -> anyhow::Result<()> {
    transaction.execute(
        "INSERT INTO projects (id, name, root_folder, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           root_folder = excluded.root_folder,
           updated_at = excluded.updated_at",
        params![
            project.project_id.as_str(),
            project.name.as_str(),
            project.root_folder.as_str(),
            now,
            now,
        ],
    )?;
    Ok(())
}

fn upsert_source_folder(
    transaction: &Transaction<'_>,
    project: &ProjectSummary,
    now: &str,
) -> anyhow::Result<()> {
    transaction.execute(
        "INSERT INTO source_folders (id, absolute_path, scan_policy, created_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET absolute_path = excluded.absolute_path",
        params![
            source_folder_id(&project.project_id),
            project.root_folder.as_str(),
            "recursive",
            now,
        ],
    )?;
    Ok(())
}

fn source_folder_id(project_id: &str) -> String {
    format!("source:{project_id}")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db_path(name: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "lumoza-{name}-{}-{}.db",
            std::process::id(),
            Utc::now().timestamp_nanos_opt().unwrap_or_default()
        ))
    }

    fn cleanup_sqlite_files(path: &Path) {
        let _ = fs::remove_file(path);
        let _ = fs::remove_file(path.with_extension("db-wal"));
        let _ = fs::remove_file(path.with_extension("db-shm"));
    }

    #[test]
    fn people_summary_counts_persisted_face_foundation() {
        let db_path = temp_db_path("people-summary");
        let connection = open_connection(&db_path).unwrap();
        apply_migrations(&connection, &db_path).unwrap();
        let now = Utc::now().to_rfc3339();

        connection
            .execute(
                "INSERT INTO source_folders (id, absolute_path, scan_policy, created_at) VALUES ('source:test', '/tmp/source', 'recursive', ?1)",
                params![now.as_str()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO photos (id, source_folder_id, absolute_path, filename, extension, file_size_bytes, modified_at, thumbnail_status, ingest_status)
                 VALUES ('photo:1', 'source:test', '/tmp/source/one.jpg', 'one.jpg', 'jpg', 100, ?1, 'generated', 'indexed'),
                        ('photo:2', 'source:test', '/tmp/source/two.jpg', 'two.jpg', 'jpg', 100, ?1, 'generated', 'indexed')",
                params![now.as_str()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO face_analysis_runs (id, status, engine, engine_version, photos_total, photos_processed, faces_detected, people_clustered, started_at, ended_at)
                 VALUES ('face-run:1', 'completed', 'test-engine', '0', 2, 2, 3, 1, ?1, ?1)",
                params![now.as_str()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO face_detections (id, photo_id, analysis_run_id, bounding_box_x, bounding_box_y, bounding_box_width, bounding_box_height, detection_confidence, quality_score, created_at)
                 VALUES ('face:1', 'photo:1', 'face-run:1', 0.1, 0.1, 0.2, 0.2, 0.95, 0.88, ?1),
                        ('face:2', 'photo:1', 'face-run:1', 0.4, 0.1, 0.2, 0.2, 0.91, 0.84, ?1),
                        ('face:3', 'photo:2', 'face-run:1', 0.2, 0.2, 0.3, 0.3, 0.81, 0.70, ?1)",
                params![now.as_str()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO people_clusters (id, display_name, representative_face_id, face_count, photo_count, priority_label, is_hidden, created_at, updated_at)
                 VALUES ('person:1', 'Maya', 'face:1', 2, 1, 'important', 0, ?1, ?1)",
                params![now.as_str()],
            )
            .unwrap();
        connection
            .execute(
                "INSERT INTO person_faces (person_id, face_detection_id, cluster_confidence, is_representative)
                 VALUES ('person:1', 'face:1', 0.98, 1),
                        ('person:1', 'face:2', 0.92, 0)",
                [],
            )
            .unwrap();
        drop(connection);

        let summary = get_project_people_summary(&db_path).unwrap();

        assert_eq!(summary.face_analysis_run_count, 1);
        assert_eq!(summary.detected_face_count, 3);
        assert_eq!(summary.clustered_people_count, 1);
        assert_eq!(summary.named_people_count, 1);
        assert_eq!(summary.priority_people_count, 1);
        assert_eq!(summary.unassigned_face_count, 1);
        assert_eq!(summary.photos_with_faces_count, 2);

        cleanup_sqlite_files(&db_path);
    }
}
