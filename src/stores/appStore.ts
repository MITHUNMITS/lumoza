import { create } from "zustand";
import type { AppBootstrapResult, AppView, SetupStep } from "../types/app";

interface AppState {
  isBootstrapping: boolean;
  bootError?: string;
  currentView: AppView;
  setupSteps: SetupStep[];
  initialize: (result: AppBootstrapResult) => void;
  startBootstrap: () => void;
  failBootstrap: (message: string) => void;
  setCurrentView: (view: AppView) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isBootstrapping: true,
  currentView: "dashboard",
  setupSteps: [],
  initialize: (result) =>
    set({
      isBootstrapping: false,
      bootError: undefined,
      setupSteps: result.steps,
    }),
  startBootstrap: () => set({ isBootstrapping: true, bootError: undefined }),
  failBootstrap: (message) => set({ isBootstrapping: false, bootError: message }),
  setCurrentView: (view) => set({ currentView: view }),
}));
