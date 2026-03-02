import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByhQEoKzDvJiIbJaTeWtGOpY8xA1LDGxw",
  authDomain: "haven-eeab1.firebaseapp.com",
  projectId: "haven-eeab1",
  storageBucket: "haven-eeab1.firebasestorage.app",
  messagingSenderId: "69781912405",
  appId: "1:69781912405:web:545fc4bc674417d371cddc",
  measurementId: "G-PWQRPX1JGT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);