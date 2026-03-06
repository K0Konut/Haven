import { fetchJson } from "./http";
import type { LatLng } from "../../types/routing";

const token = import.meta.env.VITE_MAPBOX_TOKEN as string;

export type PlaceResult = {
  id: string;
  label: string;
  context?: string;
  center: LatLng;
};

type MapboxFeature = {
  id: string;
  place_name: string;
  context?: Array<{ text?: string }>;
  center: [number, number];
};

type MapboxGeocodingResponse = {
  features?: MapboxFeature[];
};

export async function geocodeForward(query: string, proximity?: LatLng): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  const params: Record<string, string> = {
    access_token: token,
    language: "fr",
    limit: "15",
    autocomplete: "true",
    fuzzyMatch: "true",
  };

  if (proximity) {
    params.proximity = `${proximity.lng},${proximity.lat}`;
  } else {
    params.proximity = "2.3488,48.8534"; // Paris par défaut
  }

  url.search = new URLSearchParams(params).toString();

  const data = await fetchJson<MapboxGeocodingResponse>(url.toString());

  return (data.features ?? []).map((f) => ({
    id: f.id,
    label: f.place_name,
    context: f.context?.[0]?.text ?? undefined,
    center: { lng: f.center[0], lat: f.center[1] },
  }));
}
