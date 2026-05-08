export type ProjectStatus = "ready" | "scanning" | "paused" | "error";
export type ThumbnailStatus = "pending" | "generated" | "failed";

export interface ProjectSummary {
  projectId: string;
  name: string;
  rootFolder: string;
  projectDbPath: string;
  thumbnailCachePath: string;
  status: ProjectStatus;
  photoCount: number;
  lastOpenedAt?: string;
}

export interface ProjectPhoto {
  id: string;
  absolutePath: string;
  filename: string;
  extension: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  modifiedAt?: string;
  thumbnailStatus: ThumbnailStatus;
  thumbnailCachePath?: string;
}

export interface CreateProjectInput {
  name: string;
  rootFolder: string;
}
