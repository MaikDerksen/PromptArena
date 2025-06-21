
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// This config is primarily for local development via .env file
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

// Check if all the individual environment variables are present.
// This will be true for local development but false in the App Hosting build environment.
const hasAllManualKeys = Object.values(firebaseConfig).every(Boolean);

if (getApps().length === 0) {
  // If all manual keys are present (local dev), initialize with them.
  if (hasAllManualKeys) {
    app = initializeApp(firebaseConfig);
  } else {
    // Otherwise (in a deployed Firebase environment), let the SDK auto-configure
    // using the FIREBASE_CONFIG environment variable injected by App Hosting.
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);

export { app, auth, db, storage };
