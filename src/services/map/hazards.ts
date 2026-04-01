import type { Hazard } from "../../types/map";

// simple mock implementation; in a real app this would hit a backend or
// a public open‑data API that provides live feedback from riders.

const SAMPLE_HAZARDS: Hazard[] = [
  {
    id: "h1",
    center: { lat: 48.8566, lng: 2.3522 },
    type: "pothole",
    reportedAt: Date.now() - 1000 * 60 * 5,
  },
  {
    id: "h2",
    center: { lat: 48.8575, lng: 2.3600 },
    type: "construction",
    reportedAt: Date.now() - 1000 * 60 * 15,
  },
];

export async function fetchHazards(): Promise<Hazard[]> {
  // simulate network delay
  await new Promise((r) => setTimeout(r, 200));
  return SAMPLE_HAZARDS;
}
