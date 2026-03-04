import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Preferences } from '@capacitor/preferences';

// Adaptateur pour que Zustand parle avec Capacitor Preferences
const storage = {
  getItem: async (key: string) => (await Preferences.get({ key })).value,
  setItem: async (key: string, value: string) => await Preferences.set({ key, value }),
  removeItem: async (key: string) => await Preferences.remove({ key }),
};

interface SettingsState {
  sensitivity: number;
  setSensitivity: (s: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sensitivity: 15,
      setSensitivity: (s) => set({ sensitivity: s }),
    }),
    {
      name: 'softride-settings',
      storage: createJSONStorage(() => storage),
    }
  )
);