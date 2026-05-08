import { invokeOrMock } from "./tauriCommands";
import type { CreateProjectInput, ProjectSummary } from "../types/project";

const STORAGE_KEY = "lumoza.projects.v1";
const now = () => new Date().toISOString();
const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function readMockProjects(): ProjectSummary[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as ProjectSummary[];
  } catch {
    return [];
  }
}

function writeMockProjects(projects: ProjectSummary[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!hasTauriRuntime()) {
    return readMockProjects();
  }

  return invokeOrMock<ProjectSummary[]>("list_projects");
}

export async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  if (!hasTauriRuntime()) {
    const mockProjectId = crypto.randomUUID();
    const project: ProjectSummary = {
      projectId: mockProjectId,
      name: input.name,
      rootFolder: input.rootFolder,
      projectDbPath: `/AppData/Lumoza/projects/${mockProjectId}/project.db`,
      thumbnailCachePath: `/AppData/Lumoza/projects/${mockProjectId}/cache/thumbs`,
      status: "ready",
      photoCount: 0,
      lastOpenedAt: now(),
    };
    const projects = readMockProjects();
    writeMockProjects([project, ...projects.filter((entry) => entry.projectId !== project.projectId)]);
    return project;
  }

  return invokeOrMock<ProjectSummary>("create_project", { input });
}

export function applyMockScanResult(projectId: string): number {
  const projects = readMockProjects();
  const project = projects.find((entry) => entry.projectId === projectId);
  if (!project) {
    return 0;
  }

  const indexedCount = Math.max(24, Math.min(240, project.rootFolder.length * 2));
  project.photoCount = indexedCount;
  project.status = "ready";
  project.lastOpenedAt = now();
  writeMockProjects(projects);
  return indexedCount;
}
