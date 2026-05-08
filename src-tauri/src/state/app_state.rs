use std::sync::Mutex;

#[derive(Default)]
pub struct AppState {
    last_project_id: Mutex<Option<String>>,
}

impl AppState {
    pub fn set_last_project(&self, project_id: String) {
        if let Ok(mut slot) = self.last_project_id.lock() {
            *slot = Some(project_id);
        }
    }
}
