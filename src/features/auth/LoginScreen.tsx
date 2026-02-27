import React, { useState } from 'react';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';

export const LoginScreen = () => {
  const [error, setError] = useState('');

 const handleGoogleLogin = async () => {
  try {
    const result = await FirebaseAuthentication.signInWithGoogle();
    console.log("Connecté avec Google :", result.user);
  } catch (err: any) {
    console.error(err);
    setError("Erreur lors de la connexion Google");
  }
};

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h2>Connexion à HAVEN</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleGoogleLogin} style={{ padding: '10px 20px', marginTop: '10px' }}>
        Se connecter avec Google
      </button>
    </div>
  );
};