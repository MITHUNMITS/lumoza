use std::path::PathBuf;

use anyhow::Context;
use tauri::{AppHandle, Manager};

pub fn initialize(app: &AppHandle) -> anyhow::Result<()> {
    let base = app
        .path()
        .app_data_dir()
        .context("missing app data directory")?
        .join("lumoza");

    for path in [base.clone(), base.join("registry"), base.join("logs"), base.join("cache"), base.join("sidecar")] {
        std::fs::create_dir_all(&path).with_context(|| format!("failed to create {}", path.display()))?;
    }

    Ok(())
}

pub fn app_root(app: &AppHandle) -> anyhow::Result<PathBuf> {
    Ok(app.path().app_data_dir()?.join("lumoza"))
}

pub fn registry_file(app: &AppHandle) -> anyhow::Result<PathBuf> {
    Ok(app_root(app)?.join("registry").join("projects.json"))
}

pub fn project_storage_root(app: &AppHandle, project_id: &str) -> anyhow::Result<PathBuf> {
    Ok(app_root(app)?.join("projects").join(project_id))
}
