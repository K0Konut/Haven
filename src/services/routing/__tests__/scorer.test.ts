import { describe, it, expect } from 'vitest';
import { scoreCandidates } from '../../../services/routing/scorer';
import type { RoutingPreference } from '../../../types/routing';

describe('scoreCandidates', () => {
  it('should return candidates sorted by safety score descending', () => {
    const candidates = [
      {
        id: 'route_0',
        summary: {
          distanceMeters: 1000,
          durationSeconds: 600,
          stepCount: 5,
          turnLikeCount: 3,
          highSpeedRatio: 0.2,
        },
        geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
        steps: [],
      },
      {
        id: 'route_1',
        summary: {
          distanceMeters: 1200,
          durationSeconds: 700,
          stepCount: 8,
          turnLikeCount: 6,
          highSpeedRatio: 0.5,
        },
        geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
        steps: [],
      },
    ];

    const scored = scoreCandidates(candidates);

    expect(scored).toHaveLength(2);
    expect(scored[0].safetyScore).toBeGreaterThanOrEqual(scored[1].safetyScore);
    expect(scored[0].safetyScore).toBeGreaterThan(0);
    expect(scored[0].safetyScore).toBeLessThanOrEqual(100);
  });

  it('should consider avoidHighways preference', () => {
    const candidates = [
      {
        id: 'route_0',
        summary: {
          distanceMeters: 1000,
          durationSeconds: 600,
          stepCount: 5,
          turnLikeCount: 3,
          highSpeedRatio: 0.2,
        },
        geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
        steps: [],
      },
    ];

    const preference: RoutingPreference = {
      preferBikeLanes: 1,
      preferQuietStreets: 0.8,
      avoidHighways: true,
    };

    const scored = scoreCandidates(candidates, preference);

    expect(scored).toHaveLength(1);
    expect(scored[0].scoreBreakdown).toBeDefined();
  });

  it('should generate score breakdown with all metrics', () => {
    const candidates = [
      {
        id: 'route_0',
        summary: {
          distanceMeters: 1000,
          durationSeconds: 600,
          stepCount: 5,
          turnLikeCount: 3,
          highSpeedRatio: 0.2,
        },
        geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
        steps: [],
      },
    ];

    const scored = scoreCandidates(candidates);

    expect(scored[0].scoreBreakdown).toHaveProperty('time');
    expect(scored[0].scoreBreakdown).toHaveProperty('distance');
    expect(scored[0].scoreBreakdown).toHaveProperty('turns');
    expect(scored[0].scoreBreakdown).toHaveProperty('calmness');
  });
});
