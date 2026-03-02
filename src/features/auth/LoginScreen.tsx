import { useState, useEffect } from "react";
import { auth, provider } from "../../app/config/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth";

export default function LoginScreen() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ textAlign: "center", paddingTop: "50px", color: "white" }}>
      {user ? (
        <div>
          <img 
          src={user.photoURL || ""} 
           alt="Profil" 
            referrerPolicy="no-referrer" // <--- Ajoute cette ligne impérativement
            style={{ 
            width: 80, 
            height: 80, // Ajoute une hauteur fixe
            borderRadius: "50%", 
            marginBottom: 20,
            display: "block", // Force l'image à se comporter comme un bloc
            margin: "0 auto"  // Centre l'image horizontalement
  }} 
/>
          <p>Bienvenue, {user.displayName}</p>
          <button onClick={handleLogout}>Se déconnecter</button>
        </div>
      ) : (
        <div>
          <h1>Connexion à HAVEN</h1>
          <button onClick={handleLogin}>Se connecter avec Google</button>
        </div>
      )}
    </div>
  );
}