use std::{fs, path::Path};

use anyhow::Context;
use chrono::Utc;
use rusqlite::{params, Connection, Transaction};

use crate::{
    commands::project::ProjectSummary,
    services::{
        quality_analyzer::PhotoQualityMetricsRecord,
        scan_indexer::IndexedPhoto,
        thumbnail_pipeline::GeneratedThumbnail,
    },
};

const MIGRATIONS: [&str; 2] = [
    include_str!("../../migrations/0001_init.sql"),
    include_str!("../../migrations/0002_analysis.sql"),
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
}

#[derive(Debug, Clone)]
pub struct AnalysisPhotoRecord {
    pub photo_id: String,
    pub absolute_path: String,
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
    transaction.execute("DELETE FROM photo_quality_metrics", [])?;
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
            format!(r#"{{"failedCount": {}, "indexedCount": {}}}"#, failed_count, photos.len()),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;

    Ok(PersistedScanSummary {
        indexed_count: photos.len() as u64,
        failed_count,
    })
}

pub fn list_project_photos(path: &Path, offset: u32, limit: u32) -> anyhow::Result<Vec<ProjectPhotoRecord>> {
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
            photo_quality_metrics.overall_score
         FROM photos
         LEFT JOIN thumbnails ON thumbnails.photo_id = photos.id
         LEFT JOIN photo_quality_metrics ON photo_quality_metrics.photo_id = photos.id
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
        })
    })?;

    let mut photos = Vec::new();
    for row in rows {
        photos.push(row?);
    }

    Ok(photos)
}

pub fn list_analysis_photo_records(path: &Path) -> anyhow::Result<Vec<AnalysisPhotoRecord>> {
    let connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let mut statement = connection.prepare(
        "SELECT id, absolute_path FROM photos ORDER BY COALESCE(modified_at, '') DESC, filename ASC",
    )?;

    let rows = statement.query_map([], |row| {
        Ok(AnalysisPhotoRecord {
            photo_id: row.get::<_, String>(0)?,
            absolute_path: row.get::<_, String>(1)?,
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
    failed_count: u64,
) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    apply_migrations(&connection, path)?;
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();

    transaction.execute(
        "INSERT INTO analysis_runs (id, analysis_type, status, engine, engine_version, photos_total, photos_processed, failed_count, started_at, ended_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            analysis_run_id,
            "technical_quality",
            "completed",
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

    transaction.execute(
        "INSERT INTO activity_log (id, event_type, severity, message, payload_json, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            format!("analysis-run-{analysis_run_id}"),
            "quality_analysis_completed",
            if failed_count > 0 { "warning" } else { "info" },
            format!("Analyzed {} photos for technical quality.", metrics.len()),
            format!(r#"{{"failedCount": {}, "analyzedCount": {}}}"#, failed_count, metrics.len()),
            now.as_str(),
        ],
    )?;

    transaction.commit()?;
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
        let mut failed_statement = transaction.prepare(
            "UPDATE photos SET thumbnail_status = 'failed' WHERE id = ?1",
        )?;
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
                if failed_photo_ids.is_empty() { "info" } else { "warning" },
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
        fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let connection = Connection::open(path).with_context(|| format!("failed to open {}", path.display()))?;
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

fn upsert_project(transaction: &Transaction<'_>, project: &ProjectSummary, now: &str) -> anyhow::Result<()> {
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

fn upsert_source_folder(transaction: &Transaction<'_>, project: &ProjectSummary, now: &str) -> anyhow::Result<()> {
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
