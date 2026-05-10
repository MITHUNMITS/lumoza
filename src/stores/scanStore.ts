import { create } from "zustand";
import type { ActivityItem, PeopleAnalysisTask, QualityAnalysisTask, ScanTask, SmartSelectionTask } from "../types/system";

interface ScanState {
  activeTask?: ScanTask;
  activeAnalysisTask?: QualityAnalysisTask;
  activePeopleTask?: PeopleAnalysisTask;
  activeSelectionTask?: SmartSelectionTask;
  activity: ActivityItem[];
  setActiveTask: (task?: ScanTask) => void;
  setActiveAnalysisTask: (task?: QualityAnalysisTask) => void;
  setActivePeopleTask: (task?: PeopleAnalysisTask) => void;
  setActiveSelectionTask: (task?: SmartSelectionTask) => void;
  addActivity: (item: ActivityItem) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  activeTask: undefined,
  activeAnalysisTask: undefined,
  activePeopleTask: undefined,
  activeSelectionTask: undefined,
  activity: [],
  setActiveTask: (task) => set({ activeTask: task }),
  setActiveAnalysisTask: (task) => set({ activeAnalysisTask: task }),
  setActivePeopleTask: (task) => set({ activePeopleTask: task }),
  setActiveSelectionTask: (task) => set({ activeSelectionTask: task }),
  addActivity: (item) => set((state) => ({ activity: [item, ...state.activity].slice(0, 24) })),
}));
