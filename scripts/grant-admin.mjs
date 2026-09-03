/**
 * Grants (or removes) the admin claim used by the billing screens.
 *
 *     node scripts/grant-admin.mjs someone@example.com
 *     node scripts/grant-admin.mjs someone@example.com --revoke
 *     node scripts/grant-admin.mjs --list
 *
 * Confirming a payment is gated on a custom claim, and nothing in the product
 * could set one — the only instruction was a comment in a route saying to call
 * setCustomUserClaims. So no account had it, every admin call answered 403, and
 * a customer who paid could never be upgraded. This is that missing step.
 *
 * The claim is deliberately not something the app can grant itself. Anything in
 * the running product that could hand out admin becomes a way to grant yourself
 * a paid plan, so it lives here, behind having the service account key.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

/**
 * Next loads .env.local on its own; a standalone script does not, so the same
 * variables are read here rather than asking the operator to export them by
 * hand into a shell where they will sit in the history.
 */
function loadEnv() {
    const path = resolve(process.cwd(), ".env.local");
    if (!existsSync(path)) return;

    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
        if (!match) continue;

        let [, name, value] = match;
        value = value.trim();
        // The private key is stored quoted because it contains characters .env
        // would otherwise treat as syntax.
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (!(name in process.env)) process.env[name] = value;
    }
}

loadEnv();

const missing = [
    !process.env.FIREBASE_PROJECT_ID && "FIREBASE_PROJECT_ID",
    !process.env.FIREBASE_CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
    !process.env.FIREBASE_PRIVATE_KEY && "FIREBASE_PRIVATE_KEY",
].filter(Boolean);

if (missing.length) {
    console.error(
        `Missing ${missing.join(", ")} in .env.local.\n` +
        "Run node scripts/import-service-account.mjs first."
    );
    process.exit(1);
}

initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Railway and Vercel store the key with literal \n, matching
        // lib/firebase/admin.ts.
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
});

const auth = getAuth();
const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const list = args.includes("--list");
const email = args.find((a) => !a.startsWith("--"));

/** Everyone who currently holds the claim, so it can be audited. */
async function listAdmins() {
    const admins = [];
    let pageToken;

    do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) {
            if (user.customClaims?.admin === true) admins.push(user.email ?? user.uid);
        }
        pageToken = page.pageToken;
    } while (pageToken);

    if (admins.length === 0) {
        console.log("No admins yet. Grant one: node scripts/grant-admin.mjs your@email");
    } else {
        console.log(`${admins.length} admin(s):`);
        for (const who of admins) console.log(`  ${who}`);
    }
}

if (list) {
    await listAdmins();
    process.exit(0);
}

if (!email) {
    console.error(
        "Which account?\n\n" +
        "  node scripts/grant-admin.mjs someone@example.com\n" +
        "  node scripts/grant-admin.mjs someone@example.com --revoke\n" +
        "  node scripts/grant-admin.mjs --list"
    );
    process.exit(1);
}

let user;
try {
    user = await auth.getUserByEmail(email);
} catch (err) {
    if (err.code === "auth/user-not-found") {
        console.error(
            `No account for ${email}.\n` +
            "The person has to sign up first — this grants a claim on an existing account."
        );
    } else {
        console.error(`Could not look up ${email}: ${err.message}`);
    }
    process.exit(1);
}

// Merged rather than replaced: setCustomUserClaims overwrites the whole object,
// so passing only { admin } would silently drop any other claim the account has.
const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);

console.log(`${revoke ? "Revoked admin from" : "Granted admin to"} ${email} (${user.uid})`);
console.log(
    "\nThey must sign out and back in for this to take effect — the claim is\n" +
    "baked into the session cookie when it is issued, so the current session\n" +
    "still carries the old value."
);

if (revoke) {
    // Without this the removed admin keeps working until their cookie expires,
    // which is up to two weeks — too long for "remove their access now".
    await auth.revokeRefreshTokens(user.uid);
    console.log("Existing sessions revoked, so access is gone now rather than at expiry.");
}
