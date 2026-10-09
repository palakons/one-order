import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const apiKey =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA2yHcE-CToIMtA3AOjUhgiXfCRYpsfxFY";
const authDomain =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "one-order-af750.firebaseapp.com";
const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "one-order-af750";
const storageBucket =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "one-order-af750.firebasestorage.app";
const messagingSenderId =
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "28044461449";
const appId =
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:28044461449:web:5f26aa1e17948a4a25cd58";

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
};

export const isFirebaseConfigured = Boolean(apiKey && projectId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
  } catch (err) {
    console.warn("Firebase initialization warning:", err);
  }
}

export { app, db, storage };
