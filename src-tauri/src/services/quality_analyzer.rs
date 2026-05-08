use std::{path::Path, sync::Arc};

use anyhow::Result;
use image::GenericImageView;

use crate::{
    services::database::AnalysisPhotoRecord,
    state::app_state::ScanTaskControl,
};

#[derive(Debug, Clone)]
pub struct PhotoQualityMetricsRecord {
    pub photo_id: String,
    pub sharpness_score: f64,
    pub exposure_score: f64,
    pub contrast_score: f64,
    pub resolution_score: f64,
    pub overall_score: f64,
}

#[derive(Debug, Default)]
pub struct QualityAnalysisResult {
    pub metrics: Vec<PhotoQualityMetricsRecord>,
    pub failed_photo_ids: Vec<String>,
    pub cancelled: bool,
}

pub fn analyze_project_photos<F>(
    photos: &[AnalysisPhotoRecord],
    control: &Arc<ScanTaskControl>,
    on_progress: &mut F,
) -> QualityAnalysisResult
where
    F: FnMut(u64, u64, f64),
{
    let mut result = QualityAnalysisResult::default();

    for (index, photo) in photos.iter().enumerate() {
        if !control.wait_for_run_permission() {
            result.cancelled = true;
            return result;
        }

        match analyze_photo(Path::new(&photo.absolute_path), &photo.photo_id) {
            Ok(metric) => result.metrics.push(metric),
            Err(_) => result.failed_photo_ids.push(photo.photo_id.clone()),
        }

        let average_score = if result.metrics.is_empty() {
            0.0
        } else {
            result.metrics.iter().map(|entry| entry.overall_score).sum::<f64>() / result.metrics.len() as f64
        };
        on_progress((index + 1) as u64, result.failed_photo_ids.len() as u64, average_score);
    }

    result
}

fn analyze_photo(path: &Path, photo_id: &str) -> Result<PhotoQualityMetricsRecord> {
    let image = image::open(path)?;
    let grayscale = image.to_luma8();
    let (width, height) = image.dimensions();

    let sharpness_score = score_sharpness(&grayscale);
    let exposure_score = score_exposure(&grayscale);
    let contrast_score = score_contrast(&grayscale);
    let resolution_score = score_resolution(width, height);
    let overall_score = clamp_score(
        sharpness_score * 0.34 + exposure_score * 0.22 + contrast_score * 0.22 + resolution_score * 0.22,
    );

    Ok(PhotoQualityMetricsRecord {
        photo_id: photo_id.to_string(),
        sharpness_score,
        exposure_score,
        contrast_score,
        resolution_score,
        overall_score,
    })
}

fn score_sharpness(image: &image::GrayImage) -> f64 {
    let width = image.width();
    let height = image.height();
    if width < 3 || height < 3 {
        return 0.0;
    }

    let mut total = 0.0;
    let mut samples = 0.0;

    for y in 1..height - 1 {
        for x in 1..width - 1 {
            let center = image.get_pixel(x, y)[0] as f64;
            let left = image.get_pixel(x - 1, y)[0] as f64;
            let right = image.get_pixel(x + 1, y)[0] as f64;
            let top = image.get_pixel(x, y - 1)[0] as f64;
            let bottom = image.get_pixel(x, y + 1)[0] as f64;
            let laplacian = (4.0 * center - left - right - top - bottom).abs();
            total += laplacian;
            samples += 1.0;
        }
    }

    clamp_score((total / samples) / 48.0)
}

fn score_exposure(image: &image::GrayImage) -> f64 {
    let mean = mean_luminance(image);
    clamp_score(1.0 - ((mean - 0.5).abs() / 0.5))
}

fn score_contrast(image: &image::GrayImage) -> f64 {
    let mean = mean_luminance(image);
    let mut variance = 0.0;
    let mut count = 0.0;

    for pixel in image.pixels() {
        let value = pixel[0] as f64 / 255.0;
        variance += (value - mean).powi(2);
        count += 1.0;
    }

    if count == 0.0 {
        return 0.0;
    }

    let stddev = (variance / count).sqrt();
    clamp_score(stddev / 0.26)
}

fn score_resolution(width: u32, height: u32) -> f64 {
    let pixels = width as f64 * height as f64;
    let baseline = 4000_f64 * 3000_f64;
    clamp_score((pixels / baseline).sqrt())
}

fn mean_luminance(image: &image::GrayImage) -> f64 {
    let mut total = 0.0;
    let mut count = 0.0;
    for pixel in image.pixels() {
        total += pixel[0] as f64 / 255.0;
        count += 1.0;
    }
    if count == 0.0 {
        return 0.0;
    }
    total / count
}

fn clamp_score(value: f64) -> f64 {
    value.clamp(0.0, 1.0)
}
