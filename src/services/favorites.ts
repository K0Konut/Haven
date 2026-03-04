import { Preferences } from "@capacitor/preferences";
import type { LatLng } from "../types/routing";

export type Favorite = {
  id: string;
  label: string;
  address?: string;
  center: LatLng;
  category?: "home" | "work" | "other";
};

const KEY = "softride.favorites.v1";

export async function loadFavorites(): Promise<Favorite[]> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    if (!value) return [];
    const parsed = JSON.parse(value) as Favorite[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveFavorites(list: Favorite[]): Promise<void> {
  await Preferences.set({ key: KEY, value: JSON.stringify(list) });
}

export async function addOrUpdateFavorite(f: Favorite): Promise<void> {
  const all = await loadFavorites();
  const idx = all.findIndex((x) => x.id === f.id);
  if (idx >= 0) {
    all[idx] = f;
  } else {
    all.unshift(f);
  }
  await saveFavorites(all);
}

export async function removeFavorite(id: string): Promise<void> {
  const all = await loadFavorites();
  await saveFavorites(all.filter((x) => x.id !== id));
}
