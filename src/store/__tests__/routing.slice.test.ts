import { describe, it, expect, beforeEach } from 'vitest';
import { useRoutingStore } from '../routing.slice';
import type { RouteCandidate } from '../../types/routing';

describe('routing store', () => {
  beforeEach(() => {
    // Reset store before each test
    const state = useRoutingStore.getState();
    state.clear();
  });

  it('should initialize with default state', () => {
    const store = useRoutingStore.getState();

    expect(store.loading).toBe(false);
    expect(store.error).toBe(null);
    expect(store.candidates).toEqual([]);
    expect(store.selectedId).toBe(null);
  });

  it('should clear all candidates and reset state', () => {
    const store = useRoutingStore.getState();

    // Manually set some state (simulating after api call)
    useRoutingStore.setState({
      candidates: [
        {
          id: 'route_1',
          summary: { distanceMeters: 1000, durationSeconds: 600, stepCount: 5, turnLikeCount: 2, highSpeedRatio: 0.1 },
          geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
          steps: [],
          safetyScore: 85,
          scoreBreakdown: {},
        },
      ],
      selectedId: 'route_1',
    });

    store.clear();

    const cleared = useRoutingStore.getState();
    expect(cleared.candidates).toEqual([]);
    expect(cleared.selectedId).toBe(null);
    expect(cleared.error).toBe(null);
  });

  it('should select a route by id', () => {
    const mockCandidate: RouteCandidate = {
      id: 'route_1',
      summary: { distanceMeters: 1000, durationSeconds: 600, stepCount: 5, turnLikeCount: 2, highSpeedRatio: 0.1 },
      geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
      steps: [],
      safetyScore: 85,
      scoreBreakdown: {},
    };

    useRoutingStore.setState({ candidates: [mockCandidate] });

    useRoutingStore.getState().select('route_1');

    expect(useRoutingStore.getState().selectedId).toBe('route_1');
  });

  it('should return selected candidate or null', () => {
    const mockCandidate: RouteCandidate = {
      id: 'route_1',
      summary: { distanceMeters: 1000, durationSeconds: 600, stepCount: 5, turnLikeCount: 2, highSpeedRatio: 0.1 },
      geometry: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: [] } },
      steps: [],
      safetyScore: 85,
      scoreBreakdown: {},
    };

    // Without selecting
    expect(useRoutingStore.getState().selected()).toBe(null);

    // With selection
    useRoutingStore.setState({ candidates: [mockCandidate], selectedId: 'route_1' });
    expect(useRoutingStore.getState().selected()).toEqual(mockCandidate);
  });
});
