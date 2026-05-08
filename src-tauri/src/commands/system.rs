use serde::Serialize;
use tauri::State;

use crate::state::app_state::AppState;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatusResponse {
    pub python_sidecar: String,
    pub sqlite: String,
    pub registry: String,
    pub active_task_count: u64,
}

#[tauri::command]
pub fn get_system_status(state: State<AppState>) -> SystemStatusResponse {
    SystemStatusResponse {
        python_sidecar: "placeholder".into(),
        sqlite: "ready".into(),
        registry: "ready".into(),
        active_task_count: state.runtime().active_task_count(),
    }
}
