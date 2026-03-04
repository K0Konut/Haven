import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OverlayState = {
  showHazards: boolean;
  showParkings: boolean;
  toggleHazards: () => void;
  toggleParkings: () => void;
};

export const useOverlayStore = create<OverlayState>()(
  persist(
    (set) => ({
      showHazards: true,
      showParkings: true,
      toggleHazards: () => set((s) => ({ showHazards: !s.showHazards })),
      toggleParkings: () => set((s) => ({ showParkings: !s.showParkings })),
    }),
    {
      name: "overlay-storage",
    }
  )
);