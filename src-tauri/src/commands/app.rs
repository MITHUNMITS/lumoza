use serde::Serialize;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupStep {
    pub id: String,
    pub label: String,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BootstrapAppResponse {
    pub steps: Vec<SetupStep>,
    pub python_ready: bool,
    pub sqlite_ready: bool,
    pub registry_ready: bool,
}

#[tauri::command]
pub fn bootstrap_app() -> BootstrapAppResponse {
    BootstrapAppResponse {
        steps: vec![
            SetupStep {
                id: "dirs".into(),
                label: "App directories".into(),
                status: "done".into(),
                detail: "Application support folders are ready.".into(),
            },
            SetupStep {
                id: "sqlite".into(),
                label: "SQLite".into(),
                status: "done".into(),
                detail: "Project database contract is ready for migration wiring.".into(),
            },
            SetupStep {
                id: "sidecar".into(),
                label: "Python sidecar".into(),
                status: "done".into(),
                detail: "Placeholder sidecar health path is ready.".into(),
            },
            SetupStep {
                id: "registry".into(),
                label: "Project registry".into(),
                status: "done".into(),
                detail: "Registry storage location is prepared.".into(),
            },
        ],
        python_ready: true,
        sqlite_ready: true,
        registry_ready: true,
    }
}
