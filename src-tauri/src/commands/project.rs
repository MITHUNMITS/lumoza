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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPhotoResponse {
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
pub fn list_project_photos(
    app: AppHandle,
    project_id: String,
    offset: Option<u32>,
    limit: Option<u32>,
) -> Result<Vec<ProjectPhotoResponse>, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let safe_limit = limit.unwrap_or(180).clamp(1, 240);
    let safe_offset = offset.unwrap_or(0);

    let photos = database::list_project_photos(
        PathBuf::from(&project.project_db_path).as_path(),
        safe_offset,
        safe_limit,
    )
    .map_err(|error| error.to_string())?;

    Ok(photos
        .into_iter()
        .map(|photo| ProjectPhotoResponse {
            id: photo.id,
            absolute_path: photo.absolute_path,
            filename: photo.filename,
            extension: photo.extension,
            file_size_bytes: photo.file_size_bytes,
            width: photo.width,
            height: photo.height,
            modified_at: photo.modified_at,
            thumbnail_status: photo.thumbnail_status,
            thumbnail_cache_path: photo.thumbnail_cache_path,
        })
        .collect())
}

#[tauri::command]
pub fn initialize_project_database(project_db_path: String) -> Result<bool, String> {
    database::initialize_project_database(PathBuf::from(project_db_path).as_path())
        .map(|_| true)
        .map_err(|error| error.to_string())
}
