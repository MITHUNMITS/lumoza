use std::path::PathBuf;

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::services::{database, project_registry};
use crate::state::app_state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSummary {
    pub project_id: String,
    pub name: String,
    pub root_folder: String,
    pub project_db_path: String,
    pub thumbnail_cache_path: String,
    pub status: String,
    pub photo_count: u64,
    pub last_opened_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub name: String,
    pub root_folder: String,
}

#[tauri::command]
pub fn list_projects(app: AppHandle) -> Result<Vec<ProjectSummary>, String> {
    project_registry::load_registry(&app).map_err(|error| error.to_string())
}

#[tauri::command]
pub fn create_project(
    app: AppHandle,
    state: State<AppState>,
    input: CreateProjectInput,
) -> Result<ProjectSummary, String> {
    let project_id = Uuid::new_v4().to_string();
    let project_root = crate::setup::bootstrap::project_storage_root(&app, &project_id)
        .map_err(|error| error.to_string())?;
    let cache_path = project_root.join("cache").join("thumbs");
    let db_path = project_root.join("project.db");

    std::fs::create_dir_all(&cache_path).map_err(|error| error.to_string())?;

    let summary = ProjectSummary {
        project_id,
        name: input.name,
        root_folder: input.root_folder,
        project_db_path: db_path.to_string_lossy().to_string(),
        thumbnail_cache_path: cache_path.to_string_lossy().to_string(),
        status: "ready".into(),
        photo_count: 0,
        last_opened_at: Some(Utc::now().to_rfc3339()),
    };

    database::ensure_project_bootstrap(&db_path, &summary).map_err(|error| error.to_string())?;
    project_registry::append_project(&app, &summary).map_err(|error| error.to_string())?;
    state.set_last_project(summary.project_id.clone());

    Ok(summary)
}

#[tauri::command]
pub fn initialize_project_database(project_db_path: String) -> Result<bool, String> {
    database::initialize_project_database(PathBuf::from(project_db_path).as_path())
        .map(|_| true)
        .map_err(|error| error.to_string())
}
