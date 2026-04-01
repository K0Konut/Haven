import { Motion } from '@capacitor/motion';
import { useEffect, useRef } from 'react';

export const useFallDetection = (onDetection: () => void, sensitivity = 15) => {
  const lastAccel = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    const start = async () => {
      await Motion.addListener('accel', (event) => {
        const { x, y, z } = event.accelerationIncludingGravity;

        // On calcule la différence entre maintenant et la micro-seconde avant
        const deltaX = Math.abs(x - lastAccel.current.x);
        const deltaY = Math.abs(y - lastAccel.current.y);
        const deltaZ = Math.abs(z - lastAccel.current.z);

        // Si la secousse dépasse le seuil sur un des axes
        if (deltaX > sensitivity || deltaY > sensitivity || deltaZ > sensitivity) {
          onDetection();
        }

        lastAccel.current = { x, y, z };
      });
    };

    start();
    return () => { Motion.removeAllListeners(); };
  }, [onDetection, sensitivity]);
};