export type LatLng = { lat: number; lng: number };

// hazard reported by users or by external system
export type HazardType = "pothole" | "construction" | "obstacle" | "other";

export interface Hazard {
  id: string;
  center: LatLng;
  type: HazardType;
  reportedAt: number; // timestamp
}

export type ParkingType = "velib" | "scooter" | "bike" | "other";

export interface ParkingSpot {
  id: string;
  center: LatLng;
  name?: string;
  capacity?: number;
  type: ParkingType;
}
