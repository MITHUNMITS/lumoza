export type ProjectStatus = "ready" | "scanning" | "paused" | "error";

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

export interface CreateProjectInput {
  name: string;
  rootFolder: string;
}
