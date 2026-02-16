
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  getFirestore 
} from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

// eDrive Hafizabad HQ - Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCah7Ns_8cUe8lrCjjs2BK1Su8_xat4KXY",
  authDomain: "edrive1-4fbdd.firebaseapp.com",
  databaseURL: "https://edrive1-4fbdd-default-rtdb.firebaseio.com",
  projectId: "edrive1-4fbdd",
  storageBucket: "edrive1-4fbdd.firebasestorage.app",
  messagingSenderId: "705923588483",
  appId: "1:705923588483:web:9df969f62b9d49845856b6",
  measurementId: "G-7DELPRMKXE"
};

// Initialize Firebase App instance
const app = initializeApp(firebaseConfig);

/**
 * Advanced Firestore Initialization
 * 1. persistentLocalCache: Enables robust offline functionality.
 * 2. persistentMultipleTabManager: Syncs data across multiple browser tabs.
 * 3. experimentalForceLongPolling: Fixed connectivity issues ("Backend didn't respond within 10s").
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ 
    tabManager: persistentMultipleTabManager() 
  }),
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

console.log(`🔥 eDrive HQ: Connected to Firebase ${firebaseConfig.projectId} with Long-Polling enabled.`);

export default app;
