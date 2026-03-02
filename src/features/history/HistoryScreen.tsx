import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../app/config/firebase";

interface Trip {
  id: string;
  destination: string;
  distance: number;
  duration: number;
}

export default function HistoryScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const historyRef = collection(db, "users", user.uid, "history");
      const q = query(historyRef, orderBy("createdAt", "desc"));
      
      try {
        const querySnapshot = await getDocs(q);
        const historyData: Trip[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          historyData.push({
            id: doc.id,
            destination: data.destination,
            distance: data.distance,
            duration: data.duration,
          });
        });
        
        setTrips(historyData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, []);

  if (loading) {
    return <div>Chargement de l'historique...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Mon Historique de Trajets</h2>
      {trips.length === 0 ? (
        <p>Aucun trajet enregistré pour le moment.</p>
      ) : (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {trips.map((trip) => (
            <li key={trip.id} style={{ marginBottom: 15, padding: 10, border: "1px solid #ccc", borderRadius: 8 }}>
              <strong>{trip.destination}</strong><br />
              Distance : {trip.distance} mètres<br />
              Durée : {trip.duration} secondes
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}