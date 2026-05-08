use std::{fs, path::{Path, PathBuf}, time::SystemTime};

use anyhow::Result;
use chrono::{DateTime, Utc};

use crate::state::app_state::ScanTaskControl;

#[derive(Debug, Clone)]
pub struct IndexedPhoto {
    pub id: String,
    pub absolute_path: String,
    pub filename: String,
    pub extension: String,
    pub file_size_bytes: u64,
    pub modified_at: Option<String>,
}

#[derive(Debug, Default)]
pub struct DiscoveryResult {
    pub candidate_paths: Vec<PathBuf>,
    pub failed_count: u64,
    pub cancelled: bool,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "heic", "heif", "tif", "tiff"];

pub fn discover_supported_photo_paths<F>(
    root: &Path,
    control: &ScanTaskControl,
    on_progress: &mut F,
) -> DiscoveryResult
where
    F: FnMut(u64, u64),
{
    let mut result = DiscoveryResult::default();
    walk_directory(root, control, on_progress, &mut result);
    result
}

pub fn build_indexed_photo(path: &Path) -> Result<IndexedPhoto> {
    let metadata = fs::metadata(path)?;
    let absolute_path = path.canonicalize()?.to_string_lossy().to_string();
    let filename = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    let modified_at = metadata.modified().ok().map(system_time_to_rfc3339);

    Ok(IndexedPhoto {
        id: absolute_path.clone(),
        absolute_path,
        filename,
        extension,
        file_size_bytes: metadata.len(),
        modified_at,
    })
}

fn walk_directory<F>(
    path: &Path,
    control: &ScanTaskControl,
    on_progress: &mut F,
    result: &mut DiscoveryResult,
) where
    F: FnMut(u64, u64),
{
    if !control.wait_for_run_permission() {
        result.cancelled = true;
        return;
    }

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => {
            result.failed_count += 1;
            on_progress(result.candidate_paths.len() as u64, result.failed_count);
            return;
        }
    };

    for entry in entries {
        if !control.wait_for_run_permission() {
            result.cancelled = true;
            return;
        }

        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => {
                result.failed_count += 1;
                on_progress(result.candidate_paths.len() as u64, result.failed_count);
                continue;
            }
        };

        let entry_path = entry.path();
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => {
                result.failed_count += 1;
                on_progress(result.candidate_paths.len() as u64, result.failed_count);
                continue;
            }
        };

        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            if entry.file_name().to_string_lossy() == ".lumoza" {
                continue;
            }
            walk_directory(&entry_path, control, on_progress, result);
            if result.cancelled {
                return;
            }
            continue;
        }

        if !file_type.is_file() || !is_supported_image(&entry_path) {
            continue;
        }

        result.candidate_paths.push(entry_path);
        on_progress(result.candidate_paths.len() as u64, result.failed_count);
    }
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| SUPPORTED_EXTENSIONS.contains(&value.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn system_time_to_rfc3339(value: SystemTime) -> String {
    let datetime: DateTime<Utc> = value.into();
    datetime.to_rfc3339()
}
