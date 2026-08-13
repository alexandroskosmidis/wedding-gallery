import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCDcxSXKFpOgTQ-zFmQqZmWXzhHuqdgsto",
  authDomain: "wedding-gallery-5181c.firebaseapp.com",
  projectId: "wedding-gallery-5181c",
  storageBucket: "wedding-gallery-5181c.firebasestorage.app",
  messagingSenderId: "216185121497",
  appId: "1:216185121497:web:9c359a43d3028d2a486cc8",
  measurementId: "G-NRCKY9J0N2",
};

// Αρχικοποίηση του Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Εξαγωγή των εργαλείων για να τα χρησιμοποιήσουμε στα components μας
export const db = getFirestore(app);
export const storage = getStorage(app);
