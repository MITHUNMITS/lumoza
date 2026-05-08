use std::{fs, path::PathBuf};

use anyhow::Context;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::commands::project::ProjectSummary;
use crate::setup::bootstrap;

#[derive(Debug, Default, Serialize, Deserialize)]
struct ProjectRegistry {
    projects: Vec<ProjectSummary>,
}

fn registry_path(app: &AppHandle) -> anyhow::Result<PathBuf> {
    bootstrap::registry_file(app)
}

pub fn load_registry(app: &AppHandle) -> anyhow::Result<Vec<ProjectSummary>> {
    let path = registry_path(app)?;
    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(&path).with_context(|| format!("failed to read {}", path.display()))?;
    let registry: ProjectRegistry = serde_json::from_str(&raw).context("failed to parse project registry")?;
    Ok(registry.projects)
}

pub fn append_project(app: &AppHandle, project: &ProjectSummary) -> anyhow::Result<()> {
    let path = registry_path(app)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).with_context(|| format!("failed to create {}", parent.display()))?;
    }

    let mut projects = load_registry(app)?;
    projects.insert(0, project.clone());
    let payload = serde_json::to_string_pretty(&ProjectRegistry { projects })?;
    fs::write(&path, payload).with_context(|| format!("failed to write {}", path.display()))?;
    Ok(())
}
