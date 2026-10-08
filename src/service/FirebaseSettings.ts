import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// Firestore (banco). usado nas actions que leem/gravam dados do usuário: vistos, seguidos, timelines, premiações, franquias e login.
export const db: Firestore = getFirestore(app);

// Login e usuário atual (auth.currentUser). usado em quase todas as páginas e nas actions que gravam por usuário.
export const auth: Auth = getAuth(app);

isSupported()
  .then((supported) => {
    if (supported) getAnalytics(app);
  })
  .catch(() => undefined);
