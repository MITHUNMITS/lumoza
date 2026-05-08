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
    modifiedAt: new Date(Date.now() - index * 86_400_000).toISOString(),
    thumbnailStatus: "generated",
    thumbnailCachePath: `/mock-cache/${projectId}/thumb-${index + 1}.jpg`,
    quality: {
      sharpnessScore: 0.72 + (index % 5) * 0.04,
      exposureScore: 0.68 + (index % 4) * 0.05,
      contrastScore: 0.65 + (index % 6) * 0.04,
      resolutionScore: 0.88,
      overallScore: 0.74 + (index % 5) * 0.03,
    },
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
    quality: photo.overallScore === undefined && photo.sharpnessScore === undefined && photo.exposureScore === undefined && photo.contrastScore === undefined && photo.resolutionScore === undefined
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
