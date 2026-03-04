import type { ParkingSpot } from "../../types/map";

// mock data; could call a real API (e.g. CityBikes, JCDecaux, etc.)
const SAMPLE_PARKING: ParkingSpot[] = [
  {
    id: "p1",
    center: { lat: 48.8569, lng: 2.3498 },
    name: "Station Vélib' - Hôtel de Ville",
    capacity: 45,
    type: "velib",
  },
  {
    id: "p2",
    center: { lat: 48.853, lng: 2.348 },
    name: "Station Scooter",
    capacity: 12,
    type: "scooter",
  },
];

export async function fetchParkingSpots(): Promise<ParkingSpot[]> {
  await new Promise((r) => setTimeout(r, 200));
  return SAMPLE_PARKING;
}
