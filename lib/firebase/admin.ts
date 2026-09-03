import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * The server half of Firebase, used to verify session cookies.
 *
 * The credentials come from three environment variables rather than a JSON file
 * in the repo. A service account key is a full admin credential — it can read
 * and write every document and mint a token for any user — so it must never be
 * committed, and .gitignore covers .env* for that reason.
 *
 * Set up lazily so a build with no credentials still succeeds; the failure
 * surfaces when something actually asks for auth, with a message saying which
 * variable is missing.
 */

let app: App | null = null;

/**
 * Why the credentials are unusable, or null when they look right.
 *
 * The shape of the private key is checked, not just its presence. The service
 * account JSON holds both `private_key` and `private_key_id`, they sit on
 * adjacent lines, and copying the wrong one is easy. A key id passes any
 * is-it-set test but fails at PEM parsing, which surfaces as a plain 401 —
 * so signing in appears to work and then bounces straight back to /login,
 * with nothing saying why. Naming the mistake here is the difference between
 * a one-line fix and a long hunt.
 */
function misconfiguration(): string | null {
    const missing = [
        !process.env.FIREBASE_PROJECT_ID && "FIREBASE_PROJECT_ID",
        !process.env.FIREBASE_CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
        !process.env.FIREBASE_PRIVATE_KEY && "FIREBASE_PRIVATE_KEY",
    ].filter(Boolean);

    if (missing.length) return `${missing.join(", ")} not set`;

    if (!process.env.FIREBASE_PRIVATE_KEY!.includes("BEGIN PRIVATE KEY")) {
        return (
            "FIREBASE_PRIVATE_KEY is not a private key — it should be the " +
            '"private_key" field from the service account JSON, about 1700 ' +
            'characters beginning with -----BEGIN PRIVATE KEY-----. A short ' +
            'hex string is "private_key_id", which is a different field.'
        );
    }

    return null;
}

function credentials() {
    const problem = misconfiguration();
    if (problem) throw new Error(`Firebase Admin is not configured: ${problem}`);

    return {
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        // Railway and Vercel store the key with literal \n, so turn those back
        // into real newlines or the PEM parser rejects it.
        privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    };
}

export function getAdminApp(): App {
    if (app) return app;
    app = getApps().length ? getApp() : initializeApp({ credential: cert(credentials()) });
    return app;
}

export function getAdminAuth(): Auth {
    return getAuth(getAdminApp());
}

/** True when the credentials look usable, so callers can degrade rather than throw. */
export function isAdminConfigured(): boolean {
    return misconfiguration() === null;
}

/** The reason isAdminConfigured() is false, for logging. Null when it is true. */
export function adminConfigProblem(): string | null {
    return misconfiguration();
}

export const SESSION_COOKIE = "pdfai_session";

/** Firebase caps session cookies at 14 days. */
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;
