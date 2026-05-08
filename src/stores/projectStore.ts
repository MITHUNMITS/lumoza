import { create } from "zustand";
import type { ProjectSummary } from "../types/project";

interface ProjectState {
  projects: ProjectSummary[];
  currentProject?: ProjectSummary;
  setProjects: (projects: ProjectSummary[]) => void;
  addProject: (project: ProjectSummary) => void;
  openProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: undefined,
  setProjects: (projects) => set({ projects }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects], currentProject: project })),
  openProject: (projectId) => {
    const project = get().projects.find((entry) => entry.projectId === projectId);
    if (project) {
      set({ currentProject: project });
    }
  },
}));
