import { create } from "zustand";
import type { ActivityItem, ScanTask } from "../types/system";

interface ScanState {
  activeTask?: ScanTask;
  activity: ActivityItem[];
  setActiveTask: (task?: ScanTask) => void;
  addActivity: (item: ActivityItem) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  activeTask: undefined,
  activity: [],
  setActiveTask: (task) => set({ activeTask: task }),
  addActivity: (item) => set((state) => ({ activity: [item, ...state.activity].slice(0, 12) })),
}));
