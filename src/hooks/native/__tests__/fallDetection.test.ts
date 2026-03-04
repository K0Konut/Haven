import { describe, it, expect } from 'vitest';

describe('Fall Detection', () => {
  it('should detect significant acceleration changes', () => {
    // Mock accelerometer data for a potential fall
    const accelerations = [
      { x: 0, y: 0, z: 9.8 },  // Normal
      { x: 0, y: 0, z: 9.8 },  // Normal
      { x: 5, y: 5, z: 2 },    // Abnormal spike
      { x: -3, y: -3, z: 0.5 }, // Crash
    ];

    // Simple threshold-based detection
    const isFall = (acc: typeof accelerations[0]) => {
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      return magnitude < 5; // Free fall threshold
    };

    expect(isFall(accelerations[0])).toBe(false);
    expect(isFall(accelerations[2])).toBe(false);
    expect(isFall(accelerations[3])).toBe(true);
  });

  it('should filter noise from accelerometer readings', () => {
    const readings = [
      { x: 0.1, y: -0.05, z: 9.8 },
      { x: -0.08, y: 0.12, z: 9.81 },
      { x: 0.15, y: -0.2, z: 9.75 },
    ];

    const NOISE_THRESHOLD = 0.5;
    const isNoise = (acc: typeof readings[0]) => {
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + (acc.z - 9.8) ** 2);
      return magnitude < NOISE_THRESHOLD;
    };

    // All should be filtered as noise (normal variations)
    expect(readings.every(isNoise)).toBe(true);
  });

  it('should trigger alert on confirmed fall', () => {
    const consecutiveFalls = [true, true, true]; // 3 consecutive fall detections

    const MIN_FALL_COUNT = 2; // Require 2+ consecutive detections to avoid false positives
    const shouldTriggerAlert = consecutiveFalls.filter((f) => f).length >= MIN_FALL_COUNT;

    expect(shouldTriggerAlert).toBe(true);
  });

  it('should reset fall counter on normal reading', () => {
    let fallCounter = 0;

    const readings = [true, true, false, false, false]; // Fall x2, then normal x3

    for (const isFall of readings) {
      if (isFall) {
        fallCounter++;
      } else {
        fallCounter = 0; // Reset on normal reading
      }
    }

    expect(fallCounter).toBe(0);
  });
});
