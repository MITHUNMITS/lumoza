import { invokeOrMock } from "./tauriCommands";
import { listProjects } from "./projectService";
import type { ProjectPhoto } from "../types/project";

export interface ListProjectPhotosOptions {
  offset?: number;
  limit?: number;
}

interface RawProjectPhoto {
  id: string;
  absolutePath: string;
  filename: string;
  extension: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  modifiedAt?: string;
  thumbnailStatus: "pending" | "generated" | "failed";
  thumbnailCachePath?: string;
  sharpnessScore?: number;
  exposureScore?: number;
  contrastScore?: number;
  resolutionScore?: number;
  overallScore?: number;
  duplicateGroupId?: string;
  burstGroupId?: string;
  rankingScore?: number;
  selectionLabel?: "keep" | "review" | "reject";
  selectionReason?: string;
  confidenceScore?: number;
  confidenceLabel?: "high" | "medium" | "low";
  albumCandidate?: boolean;
}

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function createMockPhotos(projectId: string, count: number): ProjectPhoto[] {
  return Array.from({ length: Math.min(count, 480) }, (_, index) => ({
    id: `${projectId}-photo-${index + 1}`,
    absolutePath: `/mock/${projectId}/photo-${index + 1}.jpg`,
    filename: `photo-${String(index + 1).padStart(4, "0")}.jpg`,
    extension: "jpg",
    fileSizeBytes: 1_800_000 + index * 1024,
    width: 4200,
    height: 2800,
    modifiedAt: new Date(Date.now() - index * 2_000).toISOString(),
    thumbnailStatus: "generated",
    thumbnailCachePath: `/mock-cache/${projectId}/thumb-${index + 1}.jpg`,
    quality: {
      sharpnessScore: 0.72 + (index % 5) * 0.04,
      exposureScore: 0.68 + (index % 4) * 0.05,
      contrastScore: 0.65 + (index % 6) * 0.04,
      resolutionScore: 0.88,
      overallScore: 0.74 + (index % 5) * 0.03,
    },
    duplicateGroupId: index % 11 === 0 ? `duplicate-${Math.floor(index / 11)}` : undefined,
    burstGroupId: index % 9 < 3 ? `burst-${Math.floor(index / 9)}` : undefined,
    rankingScore: 0.48 + (index % 7) * 0.07,
    selectionLabel: index % 7 < 2 ? "keep" : index % 7 < 5 ? "review" : "reject",
    selectionReason: index % 7 < 2 ? "strong technical quality; standalone frame; high confidence" : index % 7 < 5 ? "usable technical quality; secondary burst frame; medium confidence" : "weak technical quality; lower-ranked duplicate frame; low confidence",
    confidenceScore: 0.52 + (index % 5) * 0.09,
    confidenceLabel: index % 5 > 2 ? "high" : index % 5 > 0 ? "medium" : "low",
    albumCandidate: index % 7 < 2 && index % 5 > 2,
  }));
}

function mapPhoto(photo: RawProjectPhoto): ProjectPhoto {
  return {
    id: photo.id,
    absolutePath: photo.absolutePath,
    filename: photo.filename,
    extension: photo.extension,
    fileSizeBytes: photo.fileSizeBytes,
    width: photo.width,
    height: photo.height,
    modifiedAt: photo.modifiedAt,
    thumbnailStatus: photo.thumbnailStatus,
    thumbnailCachePath: photo.thumbnailCachePath,
    duplicateGroupId: photo.duplicateGroupId,
    burstGroupId: photo.burstGroupId,
    rankingScore: photo.rankingScore,
    selectionLabel: photo.selectionLabel,
    selectionReason: photo.selectionReason,
    confidenceScore: photo.confidenceScore,
    confidenceLabel: photo.confidenceLabel,
    albumCandidate: photo.albumCandidate ?? false,
    quality:
      photo.overallScore === undefined &&
      photo.sharpnessScore === undefined &&
      photo.exposureScore === undefined &&
      photo.contrastScore === undefined &&
      photo.resolutionScore === undefined
        ? undefined
        : {
            sharpnessScore: photo.sharpnessScore,
            exposureScore: photo.exposureScore,
            contrastScore: photo.contrastScore,
            resolutionScore: photo.resolutionScore,
            overallScore: photo.overallScore,
          },
  };
}

export async function listProjectPhotos(projectId: string, options: ListProjectPhotosOptions = {}): Promise<ProjectPhoto[]> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 180;

  if (!hasTauriRuntime()) {
    const projects = await listProjects();
    const project = projects.find((entry) => entry.projectId === projectId);
    return createMockPhotos(projectId, project?.photoCount ?? 0).slice(offset, offset + limit);
  }

  const photos = await invokeOrMock<RawProjectPhoto[]>("list_project_photos", { projectId, offset, limit });
  return photos.map(mapPhoto);
}


export async function listAlbumCandidatePhotos(projectId: string, limit = 12): Promise<ProjectPhoto[]> {
  if (!hasTauriRuntime()) {
    const projects = await listProjects();
    const project = projects.find((entry) => entry.projectId === projectId);
    return createMockPhotos(projectId, project?.photoCount ?? 0)
      .filter((photo) => photo.albumCandidate)
      .sort((left, right) => (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0))
      .slice(0, limit);
  }

  const photos = await invokeOrMock<RawProjectPhoto[]>("list_project_album_candidates", { projectId, limit });
  return photos.map(mapPhoto);
}
