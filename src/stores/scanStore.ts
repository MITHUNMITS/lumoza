import { create } from "zustand";
import type { ActivityItem, QualityAnalysisTask, ScanTask } from "../types/system";

interface ScanState {
  activeTask?: ScanTask;
  activeAnalysisTask?: QualityAnalysisTask;
  activity: ActivityItem[];
  setActiveTask: (task?: ScanTask) => void;
  setActiveAnalysisTask: (task?: QualityAnalysisTask) => void;
  addActivity: (item: ActivityItem) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  activeTask: undefined,
  activeAnalysisTask: undefined,
  activity: [],
  setActiveTask: (task) => set({ activeTask: task }),
  setActiveAnalysisTask: (task) => set({ activeAnalysisTask: task }),
  addActivity: (item) => set((state) => ({ activity: [item, ...state.activity].slice(0, 24) })),
}));
