import { fetchJson } from "./http";
import type { LatLng } from "../../types/routing";

export type PlaceResult = {
  id: string;
  label: string;
  center: LatLng;
};

export async function geocodeForward(query: string, proximity?: LatLng): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: q,
    format: "json",
    limit: "6",
    countrycodes: "fr"
  }).toString();

  const data = await fetchJson<any[]>(url.toString());

  return data.map((f) => ({
    id: f.place_id.toString(),
    label: f.display_name,
    center: { lng: parseFloat(f.lon), lat: parseFloat(f.lat) },
  }));
}