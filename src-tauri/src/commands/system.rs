use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatusResponse {
    pub python_sidecar: String,
    pub sqlite: String,
    pub registry: String,
    pub active_task_count: u64,
}

#[tauri::command]
pub fn get_system_status() -> SystemStatusResponse {
    SystemStatusResponse {
        python_sidecar: "placeholder".into(),
        sqlite: "ready".into(),
        registry: "ready".into(),
        active_task_count: 0,
    }
}
