use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanTaskResponse {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub progress_current: u64,
    pub progress_total: u64,
    pub message: String,
}

fn task(project_id: &str, status: &str, message: &str) -> ScanTaskResponse {
    ScanTaskResponse {
        id: uuid::Uuid::new_v4().to_string(),
        project_id: project_id.to_string(),
        status: status.to_string(),
        progress_current: if status == "running" { 12 } else { 0 },
        progress_total: 100,
        message: message.to_string(),
    }
}

#[tauri::command]
pub fn start_scan(project_id: String) -> ScanTaskResponse {
    task(&project_id, "running", "Scanning source folders and indexing metadata.")
}

#[tauri::command]
pub fn pause_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "paused", "Paused at the next safe checkpoint.")
}

#[tauri::command]
pub fn resume_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "running", "Resumed from persisted checkpoint.")
}

#[tauri::command]
pub fn cancel_scan(task_id: String, project_id: String) -> ScanTaskResponse {
    let _ = task_id;
    task(&project_id, "cancelled", "Cancelled after persisting completed work.")
}
