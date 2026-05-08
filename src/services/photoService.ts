import { invokeOrMock } from "./tauriCommands";
import { listProjects } from "./projectService";
import type { ProjectPhoto } from "../types/project";

export interface ListProjectPhotosOptions {
  offset?: number;
  limit?: number;
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
  }));
}

export async function listProjectPhotos(projectId: string, options: ListProjectPhotosOptions = {}): Promise<ProjectPhoto[]> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? 180;

  if (!hasTauriRuntime()) {
    const projects = await listProjects();
    const project = projects.find((entry) => entry.projectId === projectId);
    return createMockPhotos(projectId, project?.photoCount ?? 0).slice(offset, offset + limit);
  }

  return invokeOrMock<ProjectPhoto[]>("list_project_photos", { projectId, offset, limit });
}
