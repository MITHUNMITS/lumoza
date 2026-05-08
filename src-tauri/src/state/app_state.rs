use std::{
    collections::HashMap,
    sync::{Arc, Condvar, Mutex},
};

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanTaskSnapshot {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub progress_current: u64,
    pub progress_total: u64,
    pub message: String,
    pub indexed_count: u64,
    pub failed_count: u64,
    pub thumbnail_generated_count: u64,
    pub thumbnail_failed_count: u64,
}

impl ScanTaskSnapshot {
    pub fn is_terminal(&self) -> bool {
        matches!(self.status.as_str(), "completed" | "cancelled" | "error")
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QualityAnalysisTaskSnapshot {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub progress_current: u64,
    pub progress_total: u64,
    pub message: String,
    pub analyzed_count: u64,
    pub failed_count: u64,
    pub average_score: f64,
    pub duplicate_group_count: u64,
    pub burst_group_count: u64,
    pub keep_count: u64,
    pub review_count: u64,
    pub reject_count: u64,
}

impl QualityAnalysisTaskSnapshot {
    pub fn is_terminal(&self) -> bool {
        matches!(self.status.as_str(), "completed" | "cancelled" | "error")
    }
}

#[derive(Default)]
struct ControlFlags {
    paused: bool,
    cancelled: bool,
}

pub struct ScanTaskControl {
    flags: Mutex<ControlFlags>,
    condvar: Condvar,
}

impl Default for ScanTaskControl {
    fn default() -> Self {
        Self {
            flags: Mutex::new(ControlFlags::default()),
            condvar: Condvar::new(),
        }
    }
}

impl ScanTaskControl {
    pub fn request_pause(&self) {
        if let Ok(mut flags) = self.flags.lock() {
            flags.paused = true;
        }
    }

    pub fn request_resume(&self) {
        if let Ok(mut flags) = self.flags.lock() {
            flags.paused = false;
            self.condvar.notify_all();
        }
    }

    pub fn request_cancel(&self) {
        if let Ok(mut flags) = self.flags.lock() {
            flags.cancelled = true;
            flags.paused = false;
            self.condvar.notify_all();
        }
    }

    pub fn wait_for_run_permission(&self) -> bool {
        let mut flags = match self.flags.lock() {
            Ok(flags) => flags,
            Err(_) => return false,
        };

        while flags.paused && !flags.cancelled {
            flags = match self.condvar.wait(flags) {
                Ok(flags) => flags,
                Err(_) => return false,
            };
        }

        !flags.cancelled
    }
}

#[derive(Clone, Default)]
pub struct AppRuntime {
    scan_tasks: Arc<Mutex<HashMap<String, ScanTaskSnapshot>>>,
    project_tasks: Arc<Mutex<HashMap<String, String>>>,
    controls: Arc<Mutex<HashMap<String, Arc<ScanTaskControl>>>>,
    quality_tasks: Arc<Mutex<HashMap<String, QualityAnalysisTaskSnapshot>>>,
    project_quality_tasks: Arc<Mutex<HashMap<String, String>>>,
    quality_controls: Arc<Mutex<HashMap<String, Arc<ScanTaskControl>>>>,
}

impl AppRuntime {
    pub fn insert_task(&self, task: ScanTaskSnapshot) {
        if let Ok(mut tasks) = self.scan_tasks.lock() {
            tasks.insert(task.id.clone(), task);
        }
    }

    pub fn bind_project_task(&self, project_id: String, task_id: String) {
        if let Ok(mut project_tasks) = self.project_tasks.lock() {
            project_tasks.insert(project_id, task_id);
        }
    }

    pub fn get_task(&self, task_id: &str) -> Option<ScanTaskSnapshot> {
        self.scan_tasks.lock().ok().and_then(|tasks| tasks.get(task_id).cloned())
    }

    pub fn get_project_task(&self, project_id: &str) -> Option<ScanTaskSnapshot> {
        let task_id = self.project_tasks.lock().ok().and_then(|project_tasks| project_tasks.get(project_id).cloned())?;
        self.get_task(&task_id)
    }

    pub fn update_task<F>(&self, task_id: &str, mutate: F) -> Option<ScanTaskSnapshot>
    where
        F: FnOnce(&mut ScanTaskSnapshot),
    {
        let mut tasks = self.scan_tasks.lock().ok()?;
        let task = tasks.get_mut(task_id)?;
        mutate(task);
        Some(task.clone())
    }

    pub fn register_control(&self, task_id: String, control: Arc<ScanTaskControl>) {
        if let Ok(mut controls) = self.controls.lock() {
            controls.insert(task_id, control);
        }
    }

    pub fn control(&self, task_id: &str) -> Option<Arc<ScanTaskControl>> {
        self.controls.lock().ok().and_then(|controls| controls.get(task_id).cloned())
    }

    pub fn clear_control(&self, task_id: &str) {
        if let Ok(mut controls) = self.controls.lock() {
            controls.remove(task_id);
        }
    }

    pub fn insert_quality_task(&self, task: QualityAnalysisTaskSnapshot) {
        if let Ok(mut tasks) = self.quality_tasks.lock() {
            tasks.insert(task.id.clone(), task);
        }
    }

    pub fn bind_project_quality_task(&self, project_id: String, task_id: String) {
        if let Ok(mut project_tasks) = self.project_quality_tasks.lock() {
            project_tasks.insert(project_id, task_id);
        }
    }

    pub fn get_quality_task(&self, task_id: &str) -> Option<QualityAnalysisTaskSnapshot> {
        self.quality_tasks.lock().ok().and_then(|tasks| tasks.get(task_id).cloned())
    }

    pub fn get_project_quality_task(&self, project_id: &str) -> Option<QualityAnalysisTaskSnapshot> {
        let task_id = self.project_quality_tasks.lock().ok().and_then(|project_tasks| project_tasks.get(project_id).cloned())?;
        self.get_quality_task(&task_id)
    }

    pub fn update_quality_task<F>(&self, task_id: &str, mutate: F) -> Option<QualityAnalysisTaskSnapshot>
    where
        F: FnOnce(&mut QualityAnalysisTaskSnapshot),
    {
        let mut tasks = self.quality_tasks.lock().ok()?;
        let task = tasks.get_mut(task_id)?;
        mutate(task);
        Some(task.clone())
    }

    pub fn register_quality_control(&self, task_id: String, control: Arc<ScanTaskControl>) {
        if let Ok(mut controls) = self.quality_controls.lock() {
            controls.insert(task_id, control);
        }
    }

    pub fn clear_quality_control(&self, task_id: &str) {
        if let Ok(mut controls) = self.quality_controls.lock() {
            controls.remove(task_id);
        }
    }

    pub fn active_task_count(&self) -> u64 {
        let scan_active = self
            .scan_tasks
            .lock()
            .ok()
            .map(|tasks| tasks.values().filter(|task| !task.is_terminal()).count() as u64)
            .unwrap_or(0);
        let analysis_active = self
            .quality_tasks
            .lock()
            .ok()
            .map(|tasks| tasks.values().filter(|task| !task.is_terminal()).count() as u64)
            .unwrap_or(0);
        scan_active + analysis_active
    }
}

#[derive(Default)]
pub struct AppState {
    last_project_id: Mutex<Option<String>>,
    runtime: AppRuntime,
}

impl AppState {
    pub fn set_last_project(&self, project_id: String) {
        if let Ok(mut slot) = self.last_project_id.lock() {
            *slot = Some(project_id);
        }
    }

    pub fn runtime(&self) -> AppRuntime {
        self.runtime.clone()
    }
}
