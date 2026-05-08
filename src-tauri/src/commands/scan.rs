use std::path::Path;

use chrono::Utc;
use serde::Serialize;
use tauri::AppHandle;

use crate::services::{database, project_registry, scan_indexer};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanTaskResponse {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub progress_current: u64,
    pub progress_total: u64,
    pub message: String,
    pub indexed_count: u64,
    pub failed_count: u64,
}

fn task(project_id: &str, status: &str, message: &str, indexed_count: u64, failed_count: u64) -> ScanTaskResponse {
    ScanTaskResponse {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        status: status.to_string(),
        progress_current: indexed_count,
        progress_total: indexed_count,
        message: message.to_string(),
        indexed_count,
        failed_count,
    }
}

#[tauri::command]
pub fn start_scan(app: AppHandle, project_id: String) -> Result<ScanTaskResponse, String> {
    let mut project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let root_folder = Path::new(&project.root_folder);
    if !root_folder.exists() {
        return Err(format!("source folder does not exist: {}", project.root_folder));
    }

    let scan_id = uuid::Uuid::new_v4().to_string();
    let indexed = scan_indexer::scan_project_tree(root_folder);
    let persisted = database::persist_scan(
        Path::new(&project.project_db_path),
        &project,
        &scan_id,
        &indexed.photos,
        indexed.failed_count,
    )
    .map_err(|error| error.to_string())?;

    project.status = "ready".into();
    project.photo_count = persisted.indexed_count;
    project.last_opened_at = Some(Utc::now().to_rfc3339());
    project_registry::upsert_project(&app, &project).map_err(|error| error.to_string())?;

    let message = if persisted.indexed_count == 0 {
        "No supported photos were found.".to_string()
    } else if persisted.failed_count > 0 {
        format!(
            "Indexed {} supported photos and skipped {} unreadable entries.",
            persisted.indexed_count, persisted.failed_count
        )
    } else {
        format!("Indexed {} supported photos.", persisted.indexed_count)
    };

    Ok(task(
        &project_id,
        "completed",
        &message,
        persisted.indexed_count,
        persisted.failed_count,
    ))
}

#[tauri::command]
pub fn pause_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "paused", "Pause is reserved for async scan execution.", 0, 0)
}

#[tauri::command]
pub fn resume_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "running", "Resume is reserved for async scan execution.", 0, 0)
}

#[tauri::command]
pub fn cancel_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "cancelled", "Cancel is reserved for async scan execution.", 0, 0)
}
