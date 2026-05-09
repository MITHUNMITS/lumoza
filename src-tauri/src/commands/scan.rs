use std::{path::Path, sync::Arc, thread};

use chrono::Utc;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::{
    commands::project::ProjectSummary,
    services::{database, project_registry, scan_indexer, thumbnail_pipeline},
    state::app_state::{AppRuntime, AppState, ScanTaskControl, ScanTaskSnapshot},
};

pub type ScanTaskResponse = ScanTaskSnapshot;

#[tauri::command]
pub fn start_scan(
    app: AppHandle,
    state: State<AppState>,
    project_id: String,
) -> Result<ScanTaskResponse, String> {
    let runtime = state.runtime();

    if let Some(existing) = runtime.get_project_task(&project_id) {
        if !existing.is_terminal() {
            return Ok(existing);
        }
    }

    let mut project = project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let root_folder = Path::new(&project.root_folder);
    if !root_folder.exists() {
        return Err(format!(
            "source folder does not exist: {}",
            project.root_folder
        ));
    }

    project.status = "scanning".into();
    project.last_opened_at = Some(Utc::now().to_rfc3339());
    project_registry::upsert_project(&app, &project).map_err(|error| error.to_string())?;

    let task = ScanTaskSnapshot {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.clone(),
        status: "running".into(),
        progress_current: 0,
        progress_total: 0,
        message: "Discovering supported photos...".into(),
        indexed_count: 0,
        failed_count: 0,
        thumbnail_generated_count: 0,
        thumbnail_failed_count: 0,
    };

    let control = Arc::new(ScanTaskControl::default());
    runtime.insert_task(task.clone());
    runtime.bind_project_task(project_id.clone(), task.id.clone());
    runtime.register_control(task.id.clone(), control.clone());

    let app_handle = app.clone();
    let runtime_clone = runtime.clone();
    let task_id = task.id.clone();
    thread::spawn(move || {
        run_scan_task(app_handle, runtime_clone, task_id, project, control);
    });

    Ok(task)
}

#[tauri::command]
pub fn get_scan_task(state: State<AppState>, task_id: String) -> Option<ScanTaskResponse> {
    state.runtime().get_task(&task_id)
}

#[tauri::command]
pub fn pause_scan(
    state: State<AppState>,
    task_id: String,
    project_id: String,
) -> Result<ScanTaskResponse, String> {
    let runtime = state.runtime();
    let control = runtime
        .control(&task_id)
        .ok_or_else(|| format!("scan task {task_id} was not found for project {project_id}"))?;
    control.request_pause();

    runtime
        .update_task(&task_id, |task| {
            task.status = "paused".into();
            task.message = "Pause requested. Waiting for a safe checkpoint.".into();
        })
        .ok_or_else(|| format!("scan task {task_id} is unavailable"))
}

#[tauri::command]
pub fn resume_scan(
    state: State<AppState>,
    task_id: String,
    project_id: String,
) -> Result<ScanTaskResponse, String> {
    let runtime = state.runtime();
    let control = runtime
        .control(&task_id)
        .ok_or_else(|| format!("scan task {task_id} was not found for project {project_id}"))?;
    control.request_resume();

    runtime
        .update_task(&task_id, |task| {
            task.status = "running".into();
            task.message = "Resuming recursive indexing...".into();
        })
        .ok_or_else(|| format!("scan task {task_id} is unavailable"))
}

#[tauri::command]
pub fn cancel_scan(
    state: State<AppState>,
    task_id: String,
    project_id: String,
) -> Result<ScanTaskResponse, String> {
    let runtime = state.runtime();
    let control = runtime
        .control(&task_id)
        .ok_or_else(|| format!("scan task {task_id} was not found for project {project_id}"))?;
    control.request_cancel();

    runtime
        .update_task(&task_id, |task| {
            task.status = "running".into();
            task.message = "Cancellation requested. Waiting for a safe stop.".into();
        })
        .ok_or_else(|| format!("scan task {task_id} is unavailable"))
}

fn run_scan_task(
    app: AppHandle,
    runtime: AppRuntime,
    task_id: String,
    mut project: ProjectSummary,
    control: Arc<ScanTaskControl>,
) {
    let result = execute_scan(&runtime, &task_id, &project, &control).and_then(|scan_result| {
        finalize_scan(
            &app,
            &runtime,
            &task_id,
            &mut project,
            &control,
            scan_result,
        )
    });

    if let Err(error) = result {
        project.status = "error".into();
        project.last_opened_at = Some(Utc::now().to_rfc3339());
        let _ = project_registry::upsert_project(&app, &project);
        let _ = runtime.update_task(&task_id, |task| {
            task.status = "error".into();
            task.message = format!("Scan failed: {error}");
        });
    }

    runtime.clear_control(&task_id);
}

struct ScanExecutionResult {
    photos: Vec<scan_indexer::IndexedPhoto>,
    failed_count: u64,
    cancelled: bool,
    discovered_total: u64,
}

fn execute_scan(
    runtime: &AppRuntime,
    task_id: &str,
    project: &ProjectSummary,
    control: &ScanTaskControl,
) -> Result<ScanExecutionResult, String> {
    let mut discovery_progress = |discovered: u64, failed_count: u64| {
        let _ = runtime.update_task(task_id, |task| {
            task.status = "running".into();
            task.progress_current = 0;
            task.progress_total = 0;
            task.message = format!("Discovering supported photos... {discovered} found");
            task.failed_count = failed_count;
        });
    };

    let discovery = scan_indexer::discover_supported_photo_paths(
        Path::new(&project.root_folder),
        control,
        &mut discovery_progress,
    );

    if discovery.cancelled {
        return Ok(ScanExecutionResult {
            photos: Vec::new(),
            failed_count: discovery.failed_count,
            cancelled: true,
            discovered_total: discovery.candidate_paths.len() as u64,
        });
    }

    let discovered_total = discovery.candidate_paths.len() as u64;
    let _ = runtime.update_task(task_id, |task| {
        task.status = "running".into();
        task.progress_current = 0;
        task.progress_total = discovered_total * 2;
        task.message = format!("Indexing {discovered_total} supported photos...");
        task.failed_count = discovery.failed_count;
    });

    let mut photos = Vec::new();
    let mut failed_count = discovery.failed_count;

    for (index, path) in discovery.candidate_paths.iter().enumerate() {
        if !control.wait_for_run_permission() {
            return Ok(ScanExecutionResult {
                photos,
                failed_count,
                cancelled: true,
                discovered_total,
            });
        }

        match scan_indexer::build_indexed_photo(path) {
            Ok(photo) => photos.push(photo),
            Err(_) => failed_count += 1,
        }

        let indexed_count = photos.len() as u64;
        let progress_current = (index + 1) as u64;
        let _ = runtime.update_task(task_id, |task| {
            task.status = "running".into();
            task.progress_current = progress_current;
            task.progress_total = discovered_total * 2;
            task.indexed_count = indexed_count;
            task.failed_count = failed_count;
            task.message =
                format!("Indexed {indexed_count} of {discovered_total} supported photos...");
        });
    }

    Ok(ScanExecutionResult {
        photos,
        failed_count,
        cancelled: false,
        discovered_total,
    })
}

fn finalize_scan(
    app: &AppHandle,
    runtime: &AppRuntime,
    task_id: &str,
    project: &mut ProjectSummary,
    control: &ScanTaskControl,
    scan_result: ScanExecutionResult,
) -> Result<(), String> {
    let persisted = database::persist_scan(
        Path::new(&project.project_db_path),
        project,
        task_id,
        &scan_result.photos,
        scan_result.failed_count,
    )
    .map_err(|error| error.to_string())?;

    let cache_root = Path::new(&project.thumbnail_cache_path);
    let mut thumbnail_progress = |processed: u64, thumbnail_failed_count: u64| {
        let _ = runtime.update_task(task_id, |task| {
            task.status = "running".into();
            task.progress_current = scan_result.discovered_total + processed;
            task.progress_total = scan_result.discovered_total * 2;
            task.thumbnail_generated_count = processed.saturating_sub(thumbnail_failed_count);
            task.thumbnail_failed_count = thumbnail_failed_count;
            task.message = format!(
                "Generating thumbnails... {processed} of {} processed",
                scan_result.discovered_total
            );
        });
    };

    let thumbnail_result = thumbnail_pipeline::generate_thumbnails(
        &scan_result.photos,
        cache_root,
        control,
        &mut thumbnail_progress,
    );

    database::persist_thumbnail_updates(
        Path::new(&project.project_db_path),
        &thumbnail_result.generated,
        &thumbnail_result.failed_photo_ids,
    )
    .map_err(|error| error.to_string())?;

    let cancelled = scan_result.cancelled || thumbnail_result.cancelled;

    project.status = "ready".into();
    project.photo_count = persisted.indexed_count;
    project.last_opened_at = Some(Utc::now().to_rfc3339());
    project_registry::upsert_project(app, project).map_err(|error| error.to_string())?;

    let thumbnail_generated_count = thumbnail_result.generated.len() as u64;
    let thumbnail_failed_count = thumbnail_result.failed_photo_ids.len() as u64;

    let message = if cancelled {
        format!(
            "Cancelled after indexing {} photos and generating {} thumbnails.",
            persisted.indexed_count, thumbnail_generated_count
        )
    } else if persisted.indexed_count == 0 {
        "No supported photos were found.".to_string()
    } else if persisted.failed_count > 0 || thumbnail_failed_count > 0 {
        format!(
            "Indexed {} photos, generated {} thumbnails, skipped {} scan entries, and failed {} thumbnails.",
            persisted.indexed_count,
            thumbnail_generated_count,
            persisted.failed_count,
            thumbnail_failed_count,
        )
    } else {
        format!(
            "Indexed {} photos and generated {} thumbnails.",
            persisted.indexed_count, thumbnail_generated_count
        )
    };

    runtime
        .update_task(task_id, |task| {
            task.status = if cancelled {
                "cancelled".into()
            } else {
                "completed".into()
            };
            task.progress_current =
                scan_result.discovered_total + thumbnail_generated_count + thumbnail_failed_count;
            task.progress_total = scan_result.discovered_total * 2;
            task.indexed_count = persisted.indexed_count;
            task.failed_count = persisted.failed_count;
            task.thumbnail_generated_count = thumbnail_generated_count;
            task.thumbnail_failed_count = thumbnail_failed_count;
            task.message = message.clone();
        })
        .ok_or_else(|| format!("scan task {task_id} was not found during finalization"))?;

    Ok(())
}
