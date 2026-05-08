use std::{fs, path::Path};

use anyhow::Context;
use chrono::Utc;
use rusqlite::{params, Connection, Transaction};

use crate::commands::project::ProjectSummary;
use crate::services::scan_indexer::IndexedPhoto;

const MIGRATION_SQL: &str = include_str!("../../migrations/0001_init.sql");

#[derive(Debug)]
pub struct PersistedScanSummary {
    pub indexed_count: u64,
    pub failed_count: u64,
}

pub fn initialize_project_database(path: &Path) -> anyhow::Result<()> {
    let connection = open_connection(path)?;
    connection
        .execute_batch(MIGRATION_SQL)
        .with_context(|| format!("failed to apply migrations to {}", path.display()))?;
    Ok(())
}

pub fn ensure_project_bootstrap(path: &Path, project: &ProjectSummary) -> anyhow::Result<()> {
    let mut connection = open_connection(path)?;
    connection
        .execute_batch(MIGRATION_SQL)
        .with_context(|| format!("failed to apply migrations to {}", path.display()))?;

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
    let transaction = connection.transaction()?;
    let now = Utc::now().to_rfc3339();
    let source_folder_id = source_folder_id(&project.project_id);

    upsert_project(&transaction, project, &now)?;
    upsert_source_folder(&transaction, project, &now)?;

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

fn open_connection(path: &Path) -> anyhow::Result<Connection> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let connection = Connection::open(path).with_context(|| format!("failed to open {}", path.display()))?;
    connection.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")?;
    Ok(connection)
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
