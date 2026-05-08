import { create } from "zustand";

interface SettingsState {
  reduceMotion: boolean;
  showActivityPanel: boolean;
  setReduceMotion: (value: boolean) => void;
  setShowActivityPanel: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  reduceMotion: false,
  showActivityPanel: true,
  setReduceMotion: (value) => set({ reduceMotion: value }),
  setShowActivityPanel: (value) => set({ showActivityPanel: value }),
}));
