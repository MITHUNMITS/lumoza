use std::{collections::HashSet, fs, path::Path};

use anyhow::Result;
use image::{DynamicImage, GenericImageView, ImageFormat, RgbImage};
use uuid::Uuid;

use crate::services::database::AnalysisPhotoRecord;

const DETECTOR_NAME: &str = "lumoza-rust-cpu-face-candidate-v1";
const MAX_DETECTIONS_PER_PHOTO: usize = 8;
const MAX_DETECTION_DIMENSION: u32 = 420;
const CROP_DIMENSION: u32 = 224;

#[derive(Debug, Clone)]
pub struct FaceDetectionRecord {
    pub id: String,
    pub photo_id: String,
    pub bounding_box_x: f64,
    pub bounding_box_y: f64,
    pub bounding_box_width: f64,
    pub bounding_box_height: f64,
    pub detection_confidence: f64,
    pub quality_score: f64,
    pub crop_cache_path: Option<String>,
    pub embedding_model: String,
    pub embedding_vector_json: String,
    pub embedding: Vec<f64>,
}

#[derive(Debug, Clone)]
pub struct PersonFaceRecord {
    pub person_id: String,
    pub face_detection_id: String,
    pub cluster_confidence: f64,
    pub is_representative: bool,
}

#[derive(Debug, Clone)]
pub struct PeopleClusterRecord {
    pub id: String,
    pub display_name: Option<String>,
    pub representative_face_id: Option<String>,
    pub face_count: u64,
    pub photo_count: u64,
    pub priority_label: String,
    pub is_hidden: bool,
    pub faces: Vec<PersonFaceRecord>,
}

#[derive(Debug, Default)]
pub struct PeopleAnalysisResult {
    pub detections: Vec<FaceDetectionRecord>,
    pub clusters: Vec<PeopleClusterRecord>,
    pub failed_photo_ids: Vec<String>,
}

#[derive(Debug, Clone)]
struct CandidateWindow {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    confidence: f64,
    quality: f64,
}

pub fn analyze_people<F>(
    photos: &[AnalysisPhotoRecord],
    crop_cache_root: &Path,
    on_progress: &mut F,
) -> PeopleAnalysisResult
where
    F: FnMut(u64, u64, u64),
{
    let mut result = PeopleAnalysisResult::default();
    let _ = fs::create_dir_all(crop_cache_root);

    for (index, photo) in photos.iter().enumerate() {
        match analyze_photo_people(photo, crop_cache_root) {
            Ok(mut detections) => result.detections.append(&mut detections),
            Err(_) => result.failed_photo_ids.push(photo.photo_id.clone()),
        }

        on_progress(
            (index + 1) as u64,
            result.failed_photo_ids.len() as u64,
            result.detections.len() as u64,
        );
    }

    result.clusters = cluster_people(&result.detections);
    result
}

fn analyze_photo_people(
    photo: &AnalysisPhotoRecord,
    crop_cache_root: &Path,
) -> Result<Vec<FaceDetectionRecord>> {
    let image = image::open(Path::new(&photo.absolute_path))?;
    let (original_width, original_height) = image.dimensions();
    if original_width < 80 || original_height < 80 {
        return Ok(Vec::new());
    }

    let scan_image = image
        .thumbnail(MAX_DETECTION_DIMENSION, MAX_DETECTION_DIMENSION)
        .to_rgb8();
    let candidates = detect_face_candidates(&scan_image);
    let mut detections = Vec::new();

    for (index, candidate) in candidates
        .into_iter()
        .take(MAX_DETECTIONS_PER_PHOTO)
        .enumerate()
    {
        let scale_x = original_width as f64 / scan_image.width() as f64;
        let scale_y = original_height as f64 / scan_image.height() as f64;
        let crop_x = (candidate.x as f64 * scale_x)
            .round()
            .clamp(0.0, original_width.saturating_sub(1) as f64) as u32;
        let crop_y = (candidate.y as f64 * scale_y)
            .round()
            .clamp(0.0, original_height.saturating_sub(1) as f64) as u32;
        let crop_width = (candidate.width as f64 * scale_x).round().max(1.0) as u32;
        let crop_height = (candidate.height as f64 * scale_y).round().max(1.0) as u32;
        let padded = padded_crop_bounds(
            crop_x,
            crop_y,
            crop_width,
            crop_height,
            original_width,
            original_height,
        );
        let crop = image.crop_imm(padded.0, padded.1, padded.2, padded.3);
        let detection_id = Uuid::new_v4().to_string();
        let crop_path = crop_cache_root.join(format!("{}-{}.jpg", photo.photo_id, index));
        save_face_crop(&crop, &crop_path)?;
        let embedding = build_embedding(&crop);
        let embedding_vector_json = serde_json::to_string(&embedding)?;

        detections.push(FaceDetectionRecord {
            id: detection_id,
            photo_id: photo.photo_id.clone(),
            bounding_box_x: crop_x as f64 / original_width as f64,
            bounding_box_y: crop_y as f64 / original_height as f64,
            bounding_box_width: crop_width.min(original_width - crop_x) as f64
                / original_width as f64,
            bounding_box_height: crop_height.min(original_height - crop_y) as f64
                / original_height as f64,
            detection_confidence: candidate.confidence,
            quality_score: candidate.quality,
            crop_cache_path: Some(crop_path.to_string_lossy().to_string()),
            embedding_model: DETECTOR_NAME.to_string(),
            embedding_vector_json,
            embedding,
        });
    }

    Ok(detections)
}

fn detect_face_candidates(image: &RgbImage) -> Vec<CandidateWindow> {
    let (width, height) = image.dimensions();
    let min_dim = width.min(height);
    if min_dim < 80 {
        return Vec::new();
    }

    let mut candidates = Vec::new();
    for scale in [0.16_f64, 0.22, 0.30, 0.38] {
        let window_height = (min_dim as f64 * scale).round().max(54.0) as u32;
        let window_width = (window_height as f64 * 0.78).round().max(42.0) as u32;
        if window_width >= width || window_height >= height {
            continue;
        }
        let step = (window_width / 3).max(12);
        let max_y = (height.saturating_sub(window_height)).min((height as f64 * 0.78) as u32);
        let mut y = 0;
        while y <= max_y {
            let mut x = 0;
            while x + window_width <= width {
                if let Some(candidate) = score_window(image, x, y, window_width, window_height) {
                    candidates.push(candidate);
                }
                x += step;
            }
            y += step;
        }
    }

    candidates.sort_by(|left, right| right.confidence.total_cmp(&left.confidence));
    non_max_suppression(candidates, 0.28)
}

fn score_window(
    image: &RgbImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Option<CandidateWindow> {
    let sample_step = (width.min(height) / 22).max(2) as usize;
    let mut skin_count = 0_u64;
    let mut sample_count = 0_u64;
    let mut luma_values = Vec::new();

    for py in (y..(y + height)).step_by(sample_step) {
        for px in (x..(x + width)).step_by(sample_step) {
            let [r, g, b] = image.get_pixel(px, py).0;
            if is_skin_like(r, g, b) {
                skin_count += 1;
            }
            luma_values.push(luma(r, g, b));
            sample_count += 1;
        }
    }

    if sample_count == 0 {
        return None;
    }

    let skin_ratio = skin_count as f64 / sample_count as f64;
    if !(0.14..=0.74).contains(&skin_ratio) {
        return None;
    }

    let contrast = standard_deviation(&luma_values);
    if contrast < 9.0 {
        return None;
    }

    let aspect_score = 1.0 - ((width as f64 / height as f64) - 0.78).abs().min(0.5) / 0.5;
    let skin_score = 1.0 - (skin_ratio - 0.36).abs().min(0.36) / 0.36;
    let vertical_center = (y as f64 + height as f64 / 2.0) / image.height() as f64;
    let vertical_score = if vertical_center < 0.72 { 1.0 } else { 0.68 };
    let contrast_score = (contrast / 42.0).clamp(0.0, 1.0);
    let confidence =
        (skin_score * 0.44 + contrast_score * 0.26 + aspect_score * 0.18 + vertical_score * 0.12)
            .clamp(0.0, 1.0);

    if confidence < 0.56 {
        return None;
    }

    Some(CandidateWindow {
        x,
        y,
        width,
        height,
        confidence,
        quality: (confidence * 0.72 + contrast_score * 0.28).clamp(0.0, 1.0),
    })
}

fn non_max_suppression(
    mut candidates: Vec<CandidateWindow>,
    threshold: f64,
) -> Vec<CandidateWindow> {
    let mut selected: Vec<CandidateWindow> = Vec::new();
    while let Some(candidate) = candidates.first().cloned() {
        candidates.remove(0);
        if selected
            .iter()
            .all(|existing| iou(existing, &candidate) < threshold)
        {
            selected.push(candidate);
        }
        if selected.len() >= MAX_DETECTIONS_PER_PHOTO {
            break;
        }
    }
    selected
}

fn iou(left: &CandidateWindow, right: &CandidateWindow) -> f64 {
    let left_x2 = left.x + left.width;
    let left_y2 = left.y + left.height;
    let right_x2 = right.x + right.width;
    let right_y2 = right.y + right.height;

    let inter_x1 = left.x.max(right.x);
    let inter_y1 = left.y.max(right.y);
    let inter_x2 = left_x2.min(right_x2);
    let inter_y2 = left_y2.min(right_y2);
    if inter_x2 <= inter_x1 || inter_y2 <= inter_y1 {
        return 0.0;
    }
    let inter_area = (inter_x2 - inter_x1) as f64 * (inter_y2 - inter_y1) as f64;
    let left_area = left.width as f64 * left.height as f64;
    let right_area = right.width as f64 * right.height as f64;
    inter_area / (left_area + right_area - inter_area)
}

fn padded_crop_bounds(
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    image_width: u32,
    image_height: u32,
) -> (u32, u32, u32, u32) {
    let pad_x = (width as f64 * 0.18).round() as u32;
    let pad_y = (height as f64 * 0.16).round() as u32;
    let crop_x = x.saturating_sub(pad_x);
    let crop_y = y.saturating_sub(pad_y);
    let crop_x2 = (x + width + pad_x).min(image_width);
    let crop_y2 = (y + height + pad_y).min(image_height);
    (
        crop_x,
        crop_y,
        (crop_x2 - crop_x).max(1),
        (crop_y2 - crop_y).max(1),
    )
}

fn save_face_crop(crop: &DynamicImage, path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let preview = crop.thumbnail(CROP_DIMENSION, CROP_DIMENSION);
    preview.save_with_format(path, ImageFormat::Jpeg)?;
    Ok(())
}

fn build_embedding(crop: &DynamicImage) -> Vec<f64> {
    let rgb = crop.thumbnail(48, 48).to_rgb8();
    let mut r_sum = 0.0;
    let mut g_sum = 0.0;
    let mut b_sum = 0.0;
    let mut histogram = [0.0_f64; 8];
    let mut count = 0.0;

    for pixel in rgb.pixels() {
        let [r, g, b] = pixel.0;
        r_sum += r as f64 / 255.0;
        g_sum += g as f64 / 255.0;
        b_sum += b as f64 / 255.0;
        let bucket = ((luma(r, g, b) / 32.0).floor() as usize).min(histogram.len() - 1);
        histogram[bucket] += 1.0;
        count += 1.0;
    }

    if count == 0.0 {
        return vec![0.0; 11];
    }

    let mut embedding = vec![r_sum / count, g_sum / count, b_sum / count];
    embedding.extend(histogram.iter().map(|value| value / count));
    embedding
}

fn cluster_people(detections: &[FaceDetectionRecord]) -> Vec<PeopleClusterRecord> {
    let mut clusters: Vec<Vec<usize>> = Vec::new();

    for (index, detection) in detections.iter().enumerate() {
        let mut best_cluster = None;
        let mut best_distance = f64::MAX;
        for (cluster_index, cluster) in clusters.iter().enumerate() {
            let representative = &detections[cluster[0]];
            let distance = embedding_distance(&detection.embedding, &representative.embedding);
            if distance < best_distance {
                best_distance = distance;
                best_cluster = Some(cluster_index);
            }
        }

        if best_distance <= 0.24 {
            if let Some(cluster_index) = best_cluster {
                clusters[cluster_index].push(index);
            }
        } else {
            clusters.push(vec![index]);
        }
    }

    clusters
        .into_iter()
        .enumerate()
        .map(|(cluster_index, members)| {
            let person_id = format!("person:{}", Uuid::new_v4());
            let representative_face_id = members.first().map(|index| detections[*index].id.clone());
            let mut photos = HashSet::new();
            let faces = members
                .iter()
                .enumerate()
                .map(|(member_index, detection_index)| {
                    let detection = &detections[*detection_index];
                    photos.insert(detection.photo_id.clone());
                    let cluster_confidence = if member_index == 0 {
                        1.0
                    } else {
                        let representative = &detections[members[0]];
                        (1.0 - embedding_distance(&detection.embedding, &representative.embedding))
                            .clamp(0.0, 1.0)
                    };
                    PersonFaceRecord {
                        person_id: person_id.clone(),
                        face_detection_id: detection.id.clone(),
                        cluster_confidence,
                        is_representative: member_index == 0,
                    }
                })
                .collect::<Vec<_>>();

            PeopleClusterRecord {
                id: person_id,
                display_name: Some(format!("Person {}", cluster_index + 1)),
                representative_face_id,
                face_count: members.len() as u64,
                photo_count: photos.len() as u64,
                priority_label: "unassigned".to_string(),
                is_hidden: false,
                faces,
            }
        })
        .collect()
}

fn embedding_distance(left: &[f64], right: &[f64]) -> f64 {
    if left.len() != right.len() || left.is_empty() {
        return 1.0;
    }
    let sum = left
        .iter()
        .zip(right.iter())
        .map(|(left, right)| (left - right).powi(2))
        .sum::<f64>();
    (sum / left.len() as f64).sqrt().clamp(0.0, 1.0)
}

fn is_skin_like(r: u8, g: u8, b: u8) -> bool {
    let r_f = r as f64;
    let g_f = g as f64;
    let b_f = b as f64;
    let y = 0.299 * r_f + 0.587 * g_f + 0.114 * b_f;
    let cb = 128.0 - 0.168_736 * r_f - 0.331_264 * g_f + 0.5 * b_f;
    let cr = 128.0 + 0.5 * r_f - 0.418_688 * g_f - 0.081_312 * b_f;
    let ycbcr_skin = y > 34.0 && (77.0..=137.0).contains(&cb) && (132.0..=183.0).contains(&cr);
    let rgb_skin = r > 70 && g > 32 && b > 18 && r > g && r > b && r.saturating_sub(b) > 18;
    ycbcr_skin || rgb_skin
}

fn luma(r: u8, g: u8, b: u8) -> f64 {
    0.299 * r as f64 + 0.587 * g as f64 + 0.114 * b as f64
}

fn standard_deviation(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mean = values.iter().sum::<f64>() / values.len() as f64;
    let variance = values
        .iter()
        .map(|value| (value - mean).powi(2))
        .sum::<f64>()
        / values.len() as f64;
    variance.sqrt()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn embedding_distance_is_zero_for_same_vector() {
        let vector = vec![0.1, 0.2, 0.3];
        assert_eq!(embedding_distance(&vector, &vector), 0.0);
    }

    #[test]
    fn skin_classifier_accepts_common_skin_tones() {
        assert!(is_skin_like(198, 132, 96));
        assert!(is_skin_like(128, 82, 55));
    }
}
