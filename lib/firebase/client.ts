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

/**
 * False when .env.local has no Firebase web config. The PDF tools do not need
 * accounts, so callers that merely want to know who is signed in (useAuth)
 * treat this as "signed out" rather than letting getAuth() throw
 * auth/invalid-api-key into the error boundary on every page.
 */
export const isFirebaseConfigured = Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId
);

function getFirebaseApp(): FirebaseApp {
    if (!isFirebaseConfigured) {
        throw Object.assign(
            new Error(
                "Accounts are not configured: set the NEXT_PUBLIC_FIREBASE_* variables in .env.local and restart the dev server."
            ),
            { code: "app/firebase-not-configured" }
        );
    }
    // getApps() covers hot reload, where the app already exists.
    if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return app;
}

export function getFirebaseAuth(): Auth {
    if (!authInstance) authInstance = getAuth(getFirebaseApp());
    return authInstance;
}

/**
 * The Realtime Database, fetched on first use.
 *
 * The app keeps its data here rather than in Firestore: Firestore now wants
 * the Blaze plan before it can be created, the Realtime Database works on the
 * free Spark plan.
 *
 * Loaded lazily so pages that never touch the database — the password-reset
 * pages, the signed-out tool pages — do not ship the SDK.
 */
const databaseURL =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;

let database: Promise<import("firebase/database").Database> | null = null;

export function getDb() {
    if (!database) {
        database = import("firebase/database").then((m) =>
            m.getDatabase(getFirebaseApp(), databaseURL)
        );
    }
    return database;
}
