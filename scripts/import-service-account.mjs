/**
 * Copies a Firebase service account key into .env.local, then deletes it.
 *
 *     node scripts/import-service-account.mjs
 *
 * No argument needed: it picks up the newest service account JSON in your
 * Downloads folder, which is where the console just put it. Pass a path if the
 * file is somewhere else.
 *
 * Every manual step here is a chance to leak an admin credential. Opening the
 * JSON to copy private_key means having it on screen; picking the right field
 * means getting past private_key_id, which sits on the adjacent line and looks
 * plausible; naming the file to a colleague or a chat means the key is one
 * paste away from a transcript. So none of those steps exist — the file is
 * already on disk, this reads it, and nothing but field names is printed.
 *
 * It also removes every service account JSON from Downloads afterwards. A
 * closing "remember to delete this" is easy to skip, and Downloads is the
 * folder most likely to be synced to the cloud or shown on a screen-share.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { homedir } from "node:os";

/**
 * The newest service account JSON sitting in Downloads.
 *
 * Run with no argument and it finds the key you just downloaded. Naming the
 * file is one more chance to put a credential somewhere it should not go — in
 * a chat message, a ticket, a screenshot — and there is nothing useful about
 * that step. The file is already on disk; this just reads it.
 */
function newestDownloadedKey() {
    const downloads = join(homedir(), "Downloads");
    if (!existsSync(downloads)) return null;

    const candidates = readdirSync(downloads)
        .filter((name) => name.endsWith(".json"))
        .map((name) => join(downloads, name))
        .filter((path) => {
            try {
                const json = JSON.parse(readFileSync(path, "utf8"));
                return json.type === "service_account" && json.private_key;
            } catch {
                return false;
            }
        })
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

    return candidates[0] ?? null;
}

const source = process.argv[2] ?? newestDownloadedKey();

if (!source) {
    console.error(
        "No service account JSON found in Downloads.\n" +
        "Generate one: Firebase Console -> Project settings -> Service accounts\n" +
        "-> Generate new private key, then run this again.\n\n" +
        "Or pass a path: node scripts/import-service-account.mjs <path.json>"
    );
    process.exit(1);
}

if (!existsSync(source)) {
    console.error(`No such file: ${source}`);
    process.exit(1);
}

if (!process.argv[2]) console.log(`Found ${source}\n`);

let key;
try {
    key = JSON.parse(readFileSync(source, "utf8"));
} catch {
    console.error(`${source} is not valid JSON. Download the key again.`);
    process.exit(1);
}

const { project_id: projectId, client_email: clientEmail, private_key: privateKey } = key;

const missing = [
    !projectId && "project_id",
    !clientEmail && "client_email",
    !privateKey && "private_key",
].filter(Boolean);

if (missing.length) {
    console.error(`That JSON has no ${missing.join(", ")}. It may not be a service account key.`);
    process.exit(1);
}

if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    console.error("The private_key field does not contain a PEM key. Download the key again.");
    process.exit(1);
}

// .env has no line continuation, so the newlines have to survive as the two
// characters \n. lib/firebase/admin.ts turns them back on the way in. This is
// also the form Railway and Vercel store, so the same value works in all three.
const escaped = privateKey.replace(/\n/g, "\\n");

const vars = {
    FIREBASE_PROJECT_ID: projectId,
    FIREBASE_CLIENT_EMAIL: clientEmail,
    FIREBASE_PRIVATE_KEY: `"${escaped}"`,
};

const envPath = resolve(process.cwd(), ".env.local");
let env = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

for (const [name, value] of Object.entries(vars)) {
    const line = `${name}=${value}`;
    // Replace in place when it is already there, so an existing file keeps its
    // order and comments rather than growing a duplicate further down that the
    // first one silently wins over.
    const existing = new RegExp(`^${name}=.*$`, "m");
    env = existing.test(env) ? env.replace(existing, line) : `${env.replace(/\s*$/, "\n")}${line}\n`;
}

writeFileSync(envPath, env);

console.log(`Wrote ${Object.keys(vars).join(", ")} to .env.local`);
console.log(`Service account: ${clientEmail}`);
console.log(`Key id: ${key.private_key_id ?? "unknown"}`);

// Shred the downloads rather than telling the reader to. "Delete it now" as a
// closing line is easy to skip, and every copy left in Downloads is a full
// admin credential in the folder most likely to be synced or screen-shared.
// The value it held is in .env.local by this point, so nothing is lost.
const downloads = join(homedir(), "Downloads");
const leftovers = existsSync(downloads)
    ? readdirSync(downloads)
          .filter((name) => name.endsWith(".json"))
          .map((name) => join(downloads, name))
          .filter((path) => {
              try {
                  return JSON.parse(readFileSync(path, "utf8")).type === "service_account";
              } catch {
                  return false;
              }
          })
    : [];

for (const path of leftovers) {
    try {
        unlinkSync(path);
        console.log(`Deleted ${path}`);
    } catch (err) {
        console.warn(`Could not delete ${path}: ${err.message} — remove it by hand.`);
    }
}

if (leftovers.length) {
    console.log(`\nRemoved ${leftovers.length} service account file(s) from Downloads.`);
}
