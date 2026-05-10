use std::{path::Path, sync::Arc, thread};

use serde::Deserialize;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::{
    services::{database, people_analyzer, quality_analyzer, smart_selector},
    state::app_state::{
        AppState, PeopleAnalysisTaskSnapshot, QualityAnalysisTaskSnapshot, ScanTaskControl,
        SmartSelectionTaskSnapshot,
    },
};

pub type QualityAnalysisTaskResponse = QualityAnalysisTaskSnapshot;
pub type PeopleAnalysisTaskResponse = PeopleAnalysisTaskSnapshot;
pub type SmartSelectionTaskResponse = SmartSelectionTaskSnapshot;

#[tauri::command]
pub fn start_quality_analysis(
    app: AppHandle,
    state: State<AppState>,
    project_id: String,
) -> Result<QualityAnalysisTaskResponse, String> {
    let runtime = state.runtime();

    if let Some(existing) = runtime.get_project_quality_task(&project_id) {
        if !existing.is_terminal() {
            return Ok(existing);
        }
    }

    let project = crate::services::project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let photos = database::list_analysis_photo_records(Path::new(&project.project_db_path))
        .map_err(|error| error.to_string())?;

    let task = QualityAnalysisTaskSnapshot {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.clone(),
        status: "running".into(),
        progress_current: 0,
        progress_total: photos.len() as u64,
        message: if photos.is_empty() {
            "No indexed photos are available for technical analysis.".into()
        } else {
            format!(
                "Analyzing technical quality across {} photos...",
                photos.len()
            )
        },
        analyzed_count: 0,
        failed_count: 0,
        average_score: 0.0,
        duplicate_group_count: 0,
        burst_group_count: 0,
        keep_count: 0,
        review_count: 0,
        reject_count: 0,
        high_confidence_count: 0,
        album_candidate_count: 0,
    };

    let control = Arc::new(ScanTaskControl::default());
    runtime.insert_quality_task(task.clone());
    runtime.bind_project_quality_task(project_id.clone(), task.id.clone());
    runtime.register_quality_control(task.id.clone(), control.clone());

    let runtime_clone = runtime.clone();
    let task_id = task.id.clone();
    thread::spawn(move || {
        run_quality_analysis_task(
            runtime_clone,
            task_id,
            project.project_db_path,
            photos,
            control,
        );
    });

    Ok(task)
}

#[tauri::command]
pub fn get_quality_analysis_task(
    state: State<AppState>,
    task_id: String,
) -> Option<QualityAnalysisTaskResponse> {
    state.runtime().get_quality_task(&task_id)
}

fn run_quality_analysis_task(
    runtime: crate::state::app_state::AppRuntime,
    task_id: String,
    project_db_path: String,
    photos: Vec<database::AnalysisPhotoRecord>,
    control: Arc<ScanTaskControl>,
) {
    if photos.is_empty() {
        let _ = runtime.update_quality_task(&task_id, |task| {
            task.status = "completed".into();
            task.message = "Analysis skipped because no indexed photos are available yet.".into();
        });
        runtime.clear_quality_control(&task_id);
        return;
    }

    let analysis_run_id = Uuid::new_v4().to_string();
    let mut progress = |processed: u64, failed_count: u64, average_score: f64| {
        let _ = runtime.update_quality_task(&task_id, |task| {
            task.status = "running".into();
            task.progress_current = processed;
            task.failed_count = failed_count;
            task.analyzed_count = processed.saturating_sub(failed_count);
            task.average_score = average_score;
            task.message = format!(
                "Analyzed {} of {} photos. Current average score {:.0}%.",
                processed,
                task.progress_total,
                average_score * 100.0,
            );
        });
    };

    let result = quality_analyzer::analyze_project_photos(&photos, &control, &mut progress);
    let failed_count = result.failed_photo_ids.len() as u64;
    let analyzed_count = result.metrics.len() as u64;
    let average_score = if result.metrics.is_empty() {
        0.0
    } else {
        result
            .metrics
            .iter()
            .map(|entry| entry.overall_score)
            .sum::<f64>()
            / result.metrics.len() as f64
    };
    let duplicate_group_count = result.duplicate_groups.len() as u64;
    let burst_group_count = result.burst_groups.len() as u64;
    let keep_count = result
        .curation_scores
        .iter()
        .filter(|score| score.selection_label == "keep")
        .count() as u64;
    let review_count = result
        .curation_scores
        .iter()
        .filter(|score| score.selection_label == "review")
        .count() as u64;
    let reject_count = result
        .curation_scores
        .iter()
        .filter(|score| score.selection_label == "reject")
        .count() as u64;
    let high_confidence_count = result
        .curation_scores
        .iter()
        .filter(|score| score.confidence_label == "high")
        .count() as u64;
    let album_candidate_count = result
        .curation_scores
        .iter()
        .filter(|score| score.album_candidate)
        .count() as u64;

    let persist_result = database::persist_quality_analysis(
        Path::new(&project_db_path),
        &analysis_run_id,
        &result.metrics,
        &result.duplicate_groups,
        &result.burst_groups,
        &result.curation_scores,
        failed_count,
        result.cancelled,
    );

    match persist_result {
        Ok(()) => {
            let _ = runtime.update_quality_task(&task_id, |task| {
                task.status = if result.cancelled { "cancelled".into() } else { "completed".into() };
                task.progress_current = analyzed_count + failed_count;
                task.analyzed_count = analyzed_count;
                task.failed_count = failed_count;
                task.average_score = average_score;
                task.duplicate_group_count = duplicate_group_count;
                task.burst_group_count = burst_group_count;
                task.keep_count = keep_count;
                task.review_count = review_count;
                task.reject_count = reject_count;
                task.high_confidence_count = high_confidence_count;
                task.album_candidate_count = album_candidate_count;
                task.message = if result.cancelled {
                    format!(
                        "Cancelled after analyzing {} photos. Average score {:.0}%. Found {} duplicate groups, {} burst groups, ranked {} keep / {} review / {} reject, and marked {} album candidates before stop.",
                        analyzed_count,
                        average_score * 100.0,
                        duplicate_group_count,
                        burst_group_count,
                        keep_count,
                        review_count,
                        reject_count,
                        album_candidate_count,
                    )
                } else {
                    format!(
                        "Analyzed {} photos with average score {:.0}%. Found {} duplicate groups, {} burst groups, ranked {} keep / {} review / {} reject, marked {} high-confidence decisions and {} album candidates, and recorded {} failures.",
                        analyzed_count,
                        average_score * 100.0,
                        duplicate_group_count,
                        burst_group_count,
                        keep_count,
                        review_count,
                        reject_count,
                        high_confidence_count,
                        album_candidate_count,
                        failed_count,
                    )
                };
            });
        }
        Err(error) => {
            let _ = runtime.update_quality_task(&task_id, |task| {
                task.status = "error".into();
                task.message = format!("Technical analysis failed: {error}");
            });
        }
    }

    runtime.clear_quality_control(&task_id);
}

#[tauri::command]
pub fn start_people_analysis(
    app: AppHandle,
    state: State<AppState>,
    project_id: String,
) -> Result<PeopleAnalysisTaskResponse, String> {
    let runtime = state.runtime();

    if let Some(existing) = runtime.get_project_people_task(&project_id) {
        if !existing.is_terminal() {
            return Ok(existing);
        }
    }

    let project = crate::services::project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let photos = database::list_analysis_photo_records(Path::new(&project.project_db_path))
        .map_err(|error| error.to_string())?;

    let task = PeopleAnalysisTaskSnapshot {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.clone(),
        status: "running".into(),
        progress_current: 0,
        progress_total: photos.len() as u64,
        message: if photos.is_empty() {
            "No memories are indexed yet.".into()
        } else {
            format!("Finding familiar faces across {} memories...", photos.len())
        },
        processed_photo_count: 0,
        failed_count: 0,
        detected_face_count: 0,
        clustered_people_count: 0,
        model_status: "local_cpu_candidate".into(),
    };

    let crop_cache_root = Path::new(&project.thumbnail_cache_path)
        .parent()
        .map(|path| path.join("faces"))
        .unwrap_or_else(|| Path::new(&project.thumbnail_cache_path).join("faces"));

    runtime.insert_people_task(task.clone());
    runtime.bind_project_people_task(project_id, task.id.clone());

    let runtime_clone = runtime.clone();
    let task_id = task.id.clone();
    thread::spawn(move || {
        run_people_analysis_task(
            runtime_clone,
            task_id,
            project.project_db_path,
            crop_cache_root.to_string_lossy().to_string(),
            photos,
        );
    });

    Ok(task)
}

#[tauri::command]
pub fn get_people_analysis_task(
    state: State<AppState>,
    task_id: String,
) -> Option<PeopleAnalysisTaskResponse> {
    state.runtime().get_people_task(&task_id)
}

fn run_people_analysis_task(
    runtime: crate::state::app_state::AppRuntime,
    task_id: String,
    project_db_path: String,
    crop_cache_root: String,
    photos: Vec<database::AnalysisPhotoRecord>,
) {
    if photos.is_empty() {
        let _ = runtime.update_people_task(&task_id, |task| {
            task.status = "completed".into();
            task.message =
                "People analysis skipped because no indexed photos are available yet.".into();
        });
        return;
    }

    let analysis_run_id = Uuid::new_v4().to_string();
    let photo_count = photos.len() as u64;
    let mut progress = |processed: u64, failed_count: u64, detected_count: u64| {
        let _ = runtime.update_people_task(&task_id, |task| {
            task.status = "running".into();
            task.progress_current = processed;
            task.processed_photo_count = processed.saturating_sub(failed_count);
            task.failed_count = failed_count;
            task.detected_face_count = detected_count;
            task.model_status = "local_cpu_candidate".into();
            task.message = format!(
                "Scanned {} of {} memories and found {} face candidates.",
                processed, task.progress_total, detected_count,
            );
        });
    };

    let result =
        people_analyzer::analyze_people(&photos, Path::new(&crop_cache_root), &mut progress);
    let failed_count = result.failed_photo_ids.len() as u64;
    let processed_count = photo_count.saturating_sub(failed_count);
    let detected_face_count = result.detections.len() as u64;
    let clustered_people_count = result.clusters.len() as u64;

    let persist_result = database::persist_people_analysis(
        Path::new(&project_db_path),
        &analysis_run_id,
        photo_count,
        &result,
        false,
    );

    match persist_result {
        Ok(()) => {
            let _ = runtime.update_people_task(&task_id, |task| {
                task.status = "completed".into();
                task.progress_current = photo_count;
                task.progress_total = photo_count;
                task.processed_photo_count = processed_count;
                task.failed_count = failed_count;
                task.detected_face_count = detected_face_count;
                task.clustered_people_count = clustered_people_count;
                task.model_status = "local_cpu_candidate".into();
                task.message = format!(
                    "People analysis complete: {} face candidates organized into {} people groups, with {} unreadable files.",
                    detected_face_count,
                    clustered_people_count,
                    failed_count,
                );
            });
        }
        Err(error) => {
            let _ = runtime.update_people_task(&task_id, |task| {
                task.status = "error".into();
                task.message = format!("People analysis failed: {error}");
            });
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartSmartSelectionInput {
    pub final_count_target: Option<u64>,
    pub review_count_target: Option<u64>,
}

#[tauri::command]
pub fn start_smart_selection(
    app: AppHandle,
    state: State<AppState>,
    project_id: String,
    input: Option<StartSmartSelectionInput>,
) -> Result<SmartSelectionTaskResponse, String> {
    let runtime = state.runtime();

    if let Some(existing) = runtime.get_project_selection_task(&project_id) {
        if !existing.is_terminal() {
            return Ok(existing);
        }
    }

    let project = crate::services::project_registry::find_project(&app, &project_id)
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("project {project_id} was not found in the registry"))?;

    let candidates =
        database::list_selection_candidate_records(Path::new(&project.project_db_path))
            .map_err(|error| error.to_string())?;
    let final_count_target = input
        .as_ref()
        .and_then(|value| value.final_count_target)
        .unwrap_or(300)
        .clamp(1, 10_000);
    let review_count_target = input
        .as_ref()
        .and_then(|value| value.review_count_target)
        .unwrap_or(1000)
        .clamp(0, 30_000);

    let task = SmartSelectionTaskSnapshot {
        id: Uuid::new_v4().to_string(),
        project_id: project_id.clone(),
        status: "running".into(),
        progress_current: 0,
        progress_total: candidates.len() as u64,
        message: if candidates.is_empty() {
            "No indexed memories are available for smart selection.".into()
        } else {
            format!(
                "Building final memory selection from {} candidates...",
                candidates.len()
            )
        },
        final_count_target,
        review_count_target,
        selected_count: 0,
        review_count: 0,
        rejected_count: 0,
        protected_count: 0,
    };

    runtime.insert_selection_task(task.clone());
    runtime.bind_project_selection_task(project_id, task.id.clone());

    let runtime_clone = runtime.clone();
    let task_id = task.id.clone();
    thread::spawn(move || {
        run_smart_selection_task(
            runtime_clone,
            task_id,
            project.project_db_path,
            candidates,
            final_count_target,
            review_count_target,
        );
    });

    Ok(task)
}

#[tauri::command]
pub fn get_smart_selection_task(
    state: State<AppState>,
    task_id: String,
) -> Option<SmartSelectionTaskResponse> {
    state.runtime().get_selection_task(&task_id)
}

fn run_smart_selection_task(
    runtime: crate::state::app_state::AppRuntime,
    task_id: String,
    project_db_path: String,
    candidates: Vec<database::SelectionCandidateRecord>,
    final_count_target: u64,
    review_count_target: u64,
) {
    if candidates.is_empty() {
        let _ = runtime.update_selection_task(&task_id, |task| {
            task.status = "completed".into();
            task.message =
                "Smart selection skipped because no indexed memories are available yet.".into();
        });
        return;
    }

    let _ = runtime.update_selection_task(&task_id, |task| {
        task.progress_current = candidates.len() as u64;
        task.message =
            "Balancing quality, people coverage, diversity, and user protections...".into();
    });

    let result =
        smart_selector::build_smart_selection(&candidates, final_count_target, review_count_target);
    let run_id = Uuid::new_v4().to_string();
    let persist_result = database::persist_smart_selection(
        Path::new(&project_db_path),
        &run_id,
        final_count_target,
        review_count_target,
        candidates.len() as u64,
        &result,
    );

    match persist_result {
        Ok(()) => {
            let _ = runtime.update_selection_task(&task_id, |task| {
                task.status = "completed".into();
                task.progress_current = candidates.len() as u64;
                task.selected_count = result.selected_count;
                task.review_count = result.review_count;
                task.rejected_count = result.rejected_count;
                task.protected_count = result.protected_count;
                task.message = format!(
                    "Smart selection complete: {} final memories, {} review items, {} rejected candidates, {} protected overrides.",
                    result.selected_count,
                    result.review_count,
                    result.rejected_count,
                    result.protected_count,
                );
            });
        }
        Err(error) => {
            let _ = runtime.update_selection_task(&task_id, |task| {
                task.status = "error".into();
                task.message = format!("Smart selection failed: {error}");
            });
        }
    }
}
