import { invokeOrMock } from "./tauriCommands";
import type { CreateProjectInput, ProjectSummary } from "../types/project";

const now = () => new Date().toISOString();

export async function listProjects(): Promise<ProjectSummary[]> {
  return invokeOrMock<ProjectSummary[]>("list_projects", undefined, []);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  const mockProjectId = crypto.randomUUID();
  const mockProject: ProjectSummary = {
    projectId: mockProjectId,
    name: input.name,
    rootFolder: input.rootFolder,
    projectDbPath: `/AppData/Lumoza/projects/${mockProjectId}/project.db`,
    thumbnailCachePath: `/AppData/Lumoza/projects/${mockProjectId}/cache/thumbs`,
    status: "ready",
    photoCount: 0,
    lastOpenedAt: now(),
  };

  return invokeOrMock<ProjectSummary>("create_project", { input }, mockProject);
}
