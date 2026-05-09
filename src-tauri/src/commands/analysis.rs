use std::{path::Path, sync::Arc, thread};

use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::{
    services::{database, quality_analyzer},
    state::app_state::{
        AppState, PeopleAnalysisTaskSnapshot, QualityAnalysisTaskSnapshot, ScanTaskControl,
    },
};

pub type QualityAnalysisTaskResponse = QualityAnalysisTaskSnapshot;
pub type PeopleAnalysisTaskResponse = PeopleAnalysisTaskSnapshot;

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
            format!(
                "Preparing people intelligence for {} memories...",
                photos.len()
            )
        },
        processed_photo_count: 0,
        detected_face_count: 0,
        clustered_people_count: 0,
        model_status: "face_ai_pack_missing".into(),
    };

    runtime.insert_people_task(task.clone());
    runtime.bind_project_people_task(project_id, task.id.clone());

    let runtime_clone = runtime.clone();
    let task_id = task.id.clone();
    thread::spawn(move || {
        run_people_analysis_task(
            runtime_clone,
            task_id,
            project.project_db_path,
            photos.len() as u64,
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
    photo_count: u64,
) {
    let analysis_run_id = Uuid::new_v4().to_string();
    let _ = runtime.update_people_task(&task_id, |task| {
        task.progress_current = photo_count;
        task.processed_photo_count = photo_count;
        task.message = "People workspace prepared. Face AI pack is not installed yet.".into();
    });

    let message = "People workspace prepared. Face AI pack is not installed yet, so no face detections were written.";
    let persist_result = database::persist_face_analysis_run(
        Path::new(&project_db_path),
        &analysis_run_id,
        "waiting_for_model",
        "phase-3-face-contract",
        photo_count,
        photo_count,
        0,
        0,
        message,
    );

    match persist_result {
        Ok(()) => {
            let _ = runtime.update_people_task(&task_id, |task| {
                task.status = "completed".into();
                task.progress_current = photo_count;
                task.progress_total = photo_count;
                task.processed_photo_count = photo_count;
                task.detected_face_count = 0;
                task.clustered_people_count = 0;
                task.model_status = "face_ai_pack_missing".into();
                task.message = message.into();
            });
        }
        Err(error) => {
            let _ = runtime.update_people_task(&task_id, |task| {
                task.status = "error".into();
                task.message = format!("People preparation failed: {error}");
            });
        }
    }
}
