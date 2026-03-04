import React from 'react';
import { useFallDetection } from '../../features/fall/useFallDetection';
import { useFallStore } from '../../store/fall.slice';
import { FallAlert } from './FallAlert';

interface FallDetectionManagerProps {
  /**
   * Called when the user either lets the countdown expire or taps "Envoyer"
   * on the alert.  The component itself doesn't know how to send the alert,
   * it just triggers the callback so that the parent (usually an
   * emergency service) can perform the actual work.
   */
  onEmergencyConfirmed: () => void;
}

export const FallDetectionManager: React.FC<FallDetectionManagerProps> = ({
  onEmergencyConfirmed,
}) => {
  // the advanced hook handles the engine, cooldown/warm‑up, countdown etc.
  const { cancel } = useFallDetection({ onConfirmed: onEmergencyConfirmed });

  // we rely on the shared store to drive the UI state
  const countdownActive = useFallStore((s) => s.countdownActive);
  const countdownSec = useFallStore((s) => s.countdownSec);

  const setEnabled = useFallStore((s) => s.setEnabled);

  // request permission / enable engine on mount, disable on unmount
  React.useEffect(() => {
    let active = true;
    (async () => {
      // ask once; if denied we still enable the store so the hook will
      // listen, but the native plugin may silently fail.  this mirrors the
      // behaviour in the panel.
      try {
        const { requestMotionPermission } = await import("../../services/permissions/motion");
        const perm = await requestMotionPermission();
        if (perm === "denied") console.warn("motion permission denied");
      } catch (e) {
        console.warn("could not request motion permission", e);
      }
      if (active) setEnabled(true);
    })();
    return () => {
      active = false;
      setEnabled(false);
    };
  }, [setEnabled]);

  if (!countdownActive) return null;

  return (
    <FallAlert
      onCancel={cancel}
      onConfirm={onEmergencyConfirmed}
      countdownSeconds={countdownSec}
    />
  );
};