
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA3SoG2M2tgJ-FcbT9PKhVItvpVU-sj30U",
  authDomain: "edrive-5ece2.firebaseapp.com",
  projectId: "edrive-5ece2",
  storageBucket: "edrive-5ece2.firebasestorage.app",
  messagingSenderId: "278318244620",
  appId: "1:278318244620:web:0abbcfb130e82a672f9f29",
  measurementId: "G-73JL754CC7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Verification Log
console.log(`🔥 eDrive: Firebase Initialized (Project: ${firebaseConfig.projectId})`);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
