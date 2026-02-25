// NOTE: this implementation is a very simplistic prototype that was
// used early in the project.  It simply fires when the raw accel magnitude
// exceeds an arbitrary threshold (30), which is far too high and will
// never happen in normal use.  The real detection logic lives in
// `src/features/fall/useFallDetection.ts` and uses a state machine, a
// configurable engine, cooldown/warm‑up handling, countdown, etc.
//
// The file is kept around only for backward‑compatibility/testing; new code
// should import from `../../features/fall/useFallDetection` instead.

import { Motion } from '@capacitor/motion';
import { useEffect } from 'react';

// re-export the legacy interface but forward to the real hook so that any
// stray imports still function (with a warning).

export const useFallDetection = (onFallDetected: () => void) => {
  console.warn(
    '[useFallDetection] legacy hook called – please import from features/fall instead'
  );

  useEffect(() => {
    const startTracking = async () => {
      try {
        await Motion.addListener('accel', (event) => {
          const { x, y, z } = event.accelerationIncludingGravity;
          // Formule de la force G totale
          const acceleration = Math.sqrt(x ** 2 + y ** 2 + z ** 2);
          
          if (acceleration > 30) { // Seuil de choc (incohérent)
            onFallDetected();
          }
        });
      } catch (e) { console.error("Erreur capteurs :", e); }
    };
    startTracking();
    return () => { Motion.removeAllListeners(); };
  }, [onFallDetected]);
};