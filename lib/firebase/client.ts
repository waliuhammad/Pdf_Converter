import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Firebase is set up on first use, which in this app is always in the browser —
 * inside an effect or a click handler.
 *
 * It used to run at module scope, so prerendering any page that imported it
 * called getAuth() on the build machine. With NEXT_PUBLIC_FIREBASE_API_KEY
 * absent there, that threw auth/invalid-api-key and took the whole build down
 * in the user library. A public client key belonging to the browser should not be able to
 * fail a server build; now it cannot, and a missing key shows up in the browser
 * where it can actually be acted on.
 */
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
    // getApps() covers hot reload, where the app already exists.
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!authInstance) authInstance = getAuth(getFirebaseApp());
    return authInstance;
}

/**
 * Firestore, fetched on first use.
 *
 * Importing it here meant every page that touched anything under lib/firebase
 * shipped the Firestore SDK — including the password-reset pages, which only
 * ever send an email. Two functions in the whole app write to Firestore; they
 * can wait a moment for it to arrive.
 */
let firestore: Promise<import("firebase/firestore").Firestore> | null = null;

export function getDb() {
    if (!firestore) {
        firestore = import("firebase/firestore").then((m) =>
            m.getFirestore(getFirebaseApp())
        );
    }
    return firestore;
}
