import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../app/config/firebase";

export async function saveTripToHistory(destinationLabel: string, distanceMeters: number, durationSeconds: number) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Utilisateur non connecté");
  }

  const historyRef = collection(db, "users", user.uid, "history");

  const docRef = await addDoc(historyRef, {
    destination: destinationLabel,
    distance: distanceMeters,
    duration: durationSeconds,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}