import { create } from "zustand";
import { persist } from "zustand/middleware";

type LastRide = {
  date: string;
  distanceMeters: number;
  durationSec: number;
};

type StatsState = {
  totalDistanceMeters: number;
  totalDurationSec: number;
  totalRides: number;
  lastRide: LastRide | null;
  addRide: (distanceMeters: number, durationSec: number) => void;
  reset: () => void;
};

export const useStatsStore = create<StatsState>()(
  persist(
    (set) => ({
      totalDistanceMeters: 0,
      totalDurationSec: 0,
      totalRides: 0,
      lastRide: null,
      addRide: (distanceMeters, durationSec) =>
        set((s) => ({
          totalDistanceMeters: s.totalDistanceMeters + distanceMeters,
          totalDurationSec: s.totalDurationSec + durationSec,
          totalRides: s.totalRides + 1,
          lastRide: {
            date: new Date().toISOString(),
            distanceMeters,
            durationSec,
          },
        })),
      reset: () =>
        set({
          totalDistanceMeters: 0,
          totalDurationSec: 0,
          totalRides: 0,
          lastRide: null,
        }),
    }),
    { name: "softride-stats" }
  )
);
