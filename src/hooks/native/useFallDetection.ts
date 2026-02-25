import { Motion } from '@capacitor/motion';
import { useEffect } from 'react';

export const useFallDetection = (onFallDetected: () => void) => {
  useEffect(() => {
    const startTracking = async () => {
      await Motion.addListener('accel', (event) => {
        const { x, y, z } = event.accelerationIncludingGravity;
        
        // Calcul de la force G totale
        const acceleration = Math.sqrt(x ** 2 + y ** 2 + z ** 2);

        // Seuil de détection : une chute libre suivie d'un impact 
        // est souvent supérieure à 30 m/s² (environ 3G)
        if (acceleration > 30) {
          console.log("Impact détecté !");
          onFallDetected();
        }
      });
    };

    startTracking();

    return () => {
      Motion.removeAllListeners();
    };
  }, [onFallDetected]);
};