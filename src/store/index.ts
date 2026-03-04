import { create } from "zustand";

type AppState = {
  isReady: boolean;
  setReady: (v: boolean) => void;
};
export interface EmergencyContact {
  email: string;
  phone: string; // Crucial pour le service SMS
  message: string;
}
export const useAppStore = create<AppState>((set) => ({
  isReady: true,
  setReady: (v) => set({ isReady: v }),
}));
