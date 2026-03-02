import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db, auth } from "../../app/config/firebase";

interface Trip {
  id: string;
  destination: string;
  distance: number;
}

interface Incident {
  id: string;
  latitude: number;
  longitude: number;
}

export default function HistoryScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const historySnap = await getDocs(query(collection(db, "users", user.uid, "history"), orderBy("createdAt", "desc")));
        setTrips(historySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));

        const incidentsSnap = await getDocs(query(collection(db, "users", user.uid, "incidents"), orderBy("timestamp", "desc")));
        setIncidents(incidentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div>Chargement...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Historique & Incidents</h2>
      
      <section>
        <h3>Mes Trajets</h3>
        {trips.map(t => (
          <div key={t.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
            {t.destination} ({t.distance}m)
          </div>
        ))}
      </section>

      <section style={{ marginTop: 30 }}>
        <h3 style={{ color: "red" }}>Zones de Chute détectées</h3>
        {incidents.length === 0 ? <p>Aucun incident.</p> : incidents.map(i => (
          <div key={i.id} style={{ border: "1px solid red", padding: 10, marginBottom: 10 }}>
            Lieu : {i.latitude.toFixed(4)}, {i.longitude.toFixed(4)}
          </div>
        ))}
      </section>
    </div>
  );
}