use std::{fs, path::Path, time::SystemTime};

use chrono::{DateTime, Utc};

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
pub struct ScanIndexResult {
    pub photos: Vec<IndexedPhoto>,
    pub failed_count: u64,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "heic", "heif", "tif", "tiff"];

pub fn scan_project_tree(root: &Path) -> ScanIndexResult {
    let mut result = ScanIndexResult::default();
    walk_directory(root, &mut result);
    result
}

fn walk_directory(path: &Path, result: &mut ScanIndexResult) {
    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => {
            result.failed_count += 1;
            return;
        }
    };

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => {
                result.failed_count += 1;
                continue;
            }
        };

        let entry_path = entry.path();
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => {
                result.failed_count += 1;
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
            walk_directory(&entry_path, result);
            continue;
        }

        if !file_type.is_file() || !is_supported_image(&entry_path) {
            continue;
        }

        match build_indexed_photo(&entry_path) {
            Ok(photo) => result.photos.push(photo),
            Err(_) => result.failed_count += 1,
        }
    }
}

fn is_supported_image(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .map(|value| SUPPORTED_EXTENSIONS.contains(&value.to_ascii_lowercase().as_str()))
        .unwrap_or(false)
}

fn build_indexed_photo(path: &Path) -> anyhow::Result<IndexedPhoto> {
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
    let modified_at = metadata
        .modified()
        .ok()
        .map(system_time_to_rfc3339);

    Ok(IndexedPhoto {
        id: absolute_path.clone(),
        absolute_path,
        filename,
        extension,
        file_size_bytes: metadata.len(),
        modified_at,
    })
}

fn system_time_to_rfc3339(value: SystemTime) -> String {
    let datetime: DateTime<Utc> = value.into();
    datetime.to_rfc3339()
}
