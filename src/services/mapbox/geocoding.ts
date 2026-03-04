import { fetchJson } from "./http";
import type { LatLng } from "../../types/routing";

export type PlaceResult = {
  id: string;
  label: string;
  center: LatLng;
};

export async function geocodeForward(query: string): Promise<PlaceResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`);
  const params: Record<string, string> = {
    access_token: token,
    language: "fr",
    limit: "8",
    autocomplete: "true",
    types: "poi,address,locality,neighborhood,place",
    country:"fr",
    fuzzyMatch: "true",
  };
   
  if (proximity) {
    params.proximity = `${proximity.lng},${proximity.lat}`;
  }
  else {
    params.proximity = "2.3488,48.8534"; // Paris par defaut
  }
  url.search = new URLSearchParams(params).toString();
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