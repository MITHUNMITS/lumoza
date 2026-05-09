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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectAnalysisSummaryResponse {
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CurationGroupSummaryResponse {
    pub group_id: String,
    pub grouping_type: String,
    pub member_count: u64,
    pub best_photo_id: Option<String>,
    pub best_filename: Option<String>,
    pub average_similarity: Option<f64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPeopleSummaryResponse {
    pub face_analysis_run_count: u64,
    pub detected_face_count: u64,
    pub clustered_people_count: u64,
    pub named_people_count: u64,
    pub priority_people_count: u64,
    pub unassigned_face_count: u64,
    pub photos_with_faces_count: u64,
}

fn map_project_photo_response(photo: database::ProjectPhotoRecord) -> ProjectPhotoResponse {
    ProjectPhotoResponse {
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
        sharpness_score: photo.sharpness_score,
        exposure_score: photo.exposure_score,
        contrast_score: photo.contrast_score,
        resolution_score: photo.resolution_score,
        overall_score: photo.overall_score,
        duplicate_group_id: photo.duplicate_group_id,
        burst_group_id: photo.burst_group_id,
        ranking_score: photo.ranking_score,
        selection_label: photo.selection_label,
        selection_reason: photo.selection_reason,
        confidence_score: photo.confidence_score,
        confidence_label: photo.confidence_label,
        album_candidate: photo.album_candidate,
    }
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

    Ok(photos.into_iter().map(map_project_photo_response).collect())
}

#[tauri::command]
pub fn list_project_album_candidates(
    app: AppHandle,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<ProjectPhotoResponse>, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let photos = database::list_album_candidate_photos(
        PathBuf::from(&project.project_db_path).as_path(),
        limit.unwrap_or(12),
    )
    .map_err(|error| error.to_string())?;

    Ok(photos.into_iter().map(map_project_photo_response).collect())
}

#[tauri::command]
pub fn list_project_review_queue(
    app: AppHandle,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<ProjectPhotoResponse>, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let photos = database::list_review_queue_photos(
        PathBuf::from(&project.project_db_path).as_path(),
        limit.unwrap_or(18),
    )
    .map_err(|error| error.to_string())?;

    Ok(photos.into_iter().map(map_project_photo_response).collect())
}

#[tauri::command]
pub fn list_project_group_summaries(
    app: AppHandle,
    project_id: String,
    limit: Option<u32>,
) -> Result<Vec<CurationGroupSummaryResponse>, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let groups = database::list_curation_group_summaries(
        PathBuf::from(&project.project_db_path).as_path(),
        limit.unwrap_or(24),
    )
    .map_err(|error| error.to_string())?;

    Ok(groups
        .into_iter()
        .map(|group| CurationGroupSummaryResponse {
            group_id: group.group_id,
            grouping_type: group.grouping_type,
            member_count: group.member_count,
            best_photo_id: group.best_photo_id,
            best_filename: group.best_filename,
            average_similarity: group.average_similarity,
        })
        .collect())
}

#[tauri::command]
pub fn get_project_analysis_summary(
    app: AppHandle,
    project_id: String,
) -> Result<ProjectAnalysisSummaryResponse, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let summary =
        database::get_project_analysis_summary(PathBuf::from(&project.project_db_path).as_path())
            .map_err(|error| error.to_string())?;

    Ok(ProjectAnalysisSummaryResponse {
        analyzed_photo_count: summary.analyzed_photo_count,
        average_overall_score: summary.average_overall_score,
        duplicate_group_count: summary.duplicate_group_count,
        burst_group_count: summary.burst_group_count,
        keep_count: summary.keep_count,
        review_count: summary.review_count,
        reject_count: summary.reject_count,
        high_confidence_count: summary.high_confidence_count,
        album_candidate_count: summary.album_candidate_count,
    })
}

#[tauri::command]
pub fn get_project_people_summary(
    app: AppHandle,
    project_id: String,
) -> Result<ProjectPeopleSummaryResponse, String> {
    let project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let summary =
        database::get_project_people_summary(PathBuf::from(&project.project_db_path).as_path())
            .map_err(|error| error.to_string())?;

    Ok(ProjectPeopleSummaryResponse {
        face_analysis_run_count: summary.face_analysis_run_count,
        detected_face_count: summary.detected_face_count,
        clustered_people_count: summary.clustered_people_count,
        named_people_count: summary.named_people_count,
        priority_people_count: summary.priority_people_count,
        unassigned_face_count: summary.unassigned_face_count,
        photos_with_faces_count: summary.photos_with_faces_count,
    })
}

#[tauri::command]
pub fn initialize_project_database(project_db_path: String) -> Result<bool, String> {
    database::initialize_project_database(PathBuf::from(project_db_path).as_path())
        .map(|_| true)
        .map_err(|error| error.to_string())
}
