import { describe, it, expect } from 'vitest';
import { distanceToRouteMeters, remainingRouteDistanceMeters } from '../geo';
import type { LatLng } from '../../../types/routing';
import type { Feature, LineString } from 'geojson';

describe('geo utilities', () => {
  const mockRoute: Feature<LineString> = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: [
        [2.3522, 48.8566],  // Paris
        [2.3532, 48.8576],
        [2.3542, 48.8586],
      ],
    },
  };

  describe('distanceToRouteMeters', () => {
    it('should calculate distance from a point to the route', () => {
      const point: LatLng = { lat: 48.8566, lng: 2.3522 };
      const result = distanceToRouteMeters(point, mockRoute);

      expect(result.distance).toBeGreaterThanOrEqual(0);
      expect(typeof result.distance).toBe('number');
      expect(typeof result.segmentIndex).toBe('number');
      expect(typeof result.t).toBe('number');
    });

    it('should return near-zero distance for point on route', () => {
      const point: LatLng = { lat: 48.8566, lng: 2.3522 };
      const result = distanceToRouteMeters(point, mockRoute);

      expect(result.distance).toBeLessThan(1000);
    });

    it('should handle invalid route gracefully', () => {
      const point: LatLng = { lat: 48.8566, lng: 2.3522 };
      const invalidRoute: Feature<LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      };

      const result = distanceToRouteMeters(point, invalidRoute);
      expect(result.distance).toBe(Infinity);
    });
  });

  describe('remainingRouteDistanceMeters', () => {
    it('should calculate remaining distance from segment index', () => {
      const segIndex = 0;
      const t = 0;
      const remaining = remainingRouteDistanceMeters(mockRoute, segIndex, t);

      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(typeof remaining).toBe('number');
    });

    it('should return full distance if at start', () => {
      const segIndex = 0;
      const t = 0;
      const remaining = remainingRouteDistanceMeters(mockRoute, segIndex, t);

      expect(remaining).toBeGreaterThan(0);
    });

    it('should return Infinity for empty route', () => {
      const emptyRoute: Feature<LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      };

      const remaining = remainingRouteDistanceMeters(emptyRoute, 0, 0);
      expect(remaining).toBe(Infinity);
    });
  });
});
