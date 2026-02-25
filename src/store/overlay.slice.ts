import { create } from "zustand";

export type OverlayState = {
  showHazards: boolean;
  showParkings: boolean;
  toggleHazards: () => void;
  toggleParkings: () => void;
};

export const useOverlayStore = create<OverlayState>((set) => ({
  showHazards: true,
  showParkings: true,
  toggleHazards: () => set((s) => ({ showHazards: !s.showHazards })),
  toggleParkings: () => set((s) => ({ showParkings: !s.showParkings })),
}));
