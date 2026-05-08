use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    path::Path,
};

use anyhow::Result;
use image::{GenericImageView, ImageFormat};

use crate::{
    services::scan_indexer::IndexedPhoto,
    state::app_state::ScanTaskControl,
};

const THUMBNAIL_MAX_DIMENSION: u32 = 320;
const BATCH_SIZE: usize = 24;

#[derive(Debug, Clone)]
pub struct GeneratedThumbnail {
    pub photo_id: String,
    pub cache_path: String,
    pub original_width: u32,
    pub original_height: u32,
    pub thumbnail_width: u32,
    pub thumbnail_height: u32,
}

#[derive(Debug, Default)]
pub struct ThumbnailGenerationResult {
    pub generated: Vec<GeneratedThumbnail>,
    pub failed_photo_ids: Vec<String>,
    pub cancelled: bool,
}

pub fn generate_thumbnails<F>(
    photos: &[IndexedPhoto],
    cache_root: &Path,
    control: &ScanTaskControl,
    on_progress: &mut F,
) -> ThumbnailGenerationResult
where
    F: FnMut(u64, u64),
{
    let mut result = ThumbnailGenerationResult::default();
    let mut processed = 0_u64;

    let _ = fs::create_dir_all(cache_root);

    for batch in photos.chunks(BATCH_SIZE) {
        for photo in batch {
            if !control.wait_for_run_permission() {
                result.cancelled = true;
                return result;
            }

            match generate_thumbnail(photo, cache_root) {
                Ok(record) => result.generated.push(record),
                Err(_) => result.failed_photo_ids.push(photo.id.clone()),
            }

            processed += 1;
            on_progress(processed, result.failed_photo_ids.len() as u64);
        }
    }

    result
}

fn generate_thumbnail(photo: &IndexedPhoto, cache_root: &Path) -> Result<GeneratedThumbnail> {
    let image = image::open(&photo.absolute_path)?;
    let (original_width, original_height) = image.dimensions();
    let thumbnail = image.thumbnail(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION);
    let (thumbnail_width, thumbnail_height) = thumbnail.dimensions();

    let output_path = cache_root.join(format!("{}.jpg", hashed_id(&photo.id)));
    thumbnail.save_with_format(&output_path, ImageFormat::Jpeg)?;

    Ok(GeneratedThumbnail {
        photo_id: photo.id.clone(),
        cache_path: output_path.to_string_lossy().to_string(),
        original_width,
        original_height,
        thumbnail_width,
        thumbnail_height,
    })
}

fn hashed_id(value: &str) -> String {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}
