import React, { useState, useEffect } from 'react';

interface FallAlertProps {
  onCancel: () => void; // Pour dire "Tout va bien"
  onConfirm: () => void; // Pour envoyer l'alerte tout de suite
  countdownSeconds?: number;
}

export const FallAlert: React.FC<FallAlertProps> = ({ 
  onCancel, 
  onConfirm, 
  countdownSeconds = 10 
}) => {
  const [seconds, setSeconds] = useState(countdownSeconds);

  useEffect(() => {
    // Si le compteur arrive à 0, on lance l'alerte automatiquement
    if (seconds <= 0) {
      onConfirm();
      return;
    }
    const timer = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds, onConfirm]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(220, 38, 38, 0.95)', // Un rouge bien visible
      color: 'white', display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', zIndex: 9999, 
      textAlign: 'center', padding: '20px', fontFamily: 'sans-serif'
    }}>
      <div style={{ fontSize: '4rem' }}>⚠️</div>
      <h1 style={{ fontSize: '2rem', margin: '10px 0' }}>CHUTE DÉTECTÉE !</h1>
      <p style={{ fontSize: '1.1rem', maxWidth: '300px' }}>
        Sans action de votre part, une alerte sera envoyée à votre contact d'urgence dans :
      </p>
      
      <div style={{ 
        fontSize: '6rem', fontWeight: 'bold', margin: '20px 0',
        textShadow: '0px 4px 10px rgba(0,0,0,0.3)' 
      }}>
        {seconds}s
      </div>

      <button 
        onClick={onCancel}
        style={{
          padding: '18px 50px', fontSize: '1.4rem', borderRadius: '50px',
          border: 'none', backgroundColor: 'white', color: '#dc2626', 
          fontWeight: 'bold', boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          cursor: 'pointer'
        }}
      >
        JE VAIS BIEN
      </button>

      <button 
        onClick={onConfirm}
        style={{
          marginTop: '20px', background: 'none', border: '1px solid white',
          color: 'white', padding: '8px 20px', borderRadius: '5px', opacity: 0.8
        }}
      >
        Envoyer maintenant
      </button>
    </div>
  );
};