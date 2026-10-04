"use client";

import { getDb } from "./client";
import type { DocumentItem } from "@/lib/store";

/**
 * Realtime Database persistence for the user's library.
 *
 * Everything lives under library/{uid}/{key}, which is exactly the shape the
 * security rules (database.rules.json) protect: a signed-in user can touch
 * their own branch and nobody else's. It is kept apart from users/{uid} so
 * reading a profile does not download the whole library with it.
 *
 * getDb() resolves to the database asynchronously (the SDK is lazy-loaded so
 * pages that never touch it don't ship it), and the query helpers are imported
 * the same way. This module is reached from lib/store, which the (app) layout
 * mounts, so a top-level import would make every visitor to every tool page
 * download the SDK — including signed-out ones, who have no library to load.
 *
 * Records keep the same field shapes as the in-memory store (numeric
 * timestamps included), so the store and pages don't translate anything.
 */

/** The SDK and the database together, both resolved on first use. */
async function database() {
    const [sdk, db] = await Promise.all([import("firebase/database"), getDb()]);
    return { ...sdk, db };
}

/**
 * Database keys may not contain . # $ [ ] or /, and document ids do — the
 * upload modal builds them from the file name ("report.pdf-…-0.42"). The key
 * is an encoded copy; the record keeps its real id.
 */
function keyFor(id: string): string {
    return encodeURIComponent(id).replace(/\./g, "%2E");
}

/** Everything at once: one read on sign-in fills the whole library. */
export async function loadLibrary(
    uid: string
): Promise<{ documents: DocumentItem[] }> {
    const { ref, get, db } = await database();

    const snap = await get(ref(db, `library/${uid}`));
    const records = (snap.val() ?? {}) as Record<string, DocumentItem>;

    const documents = Object.values(records).sort((a, b) => b.timestamp - a.timestamp);

    return { documents };
}

export async function saveDocumentRecord(uid: string, item: DocumentItem): Promise<void> {
    const { ref, set, db } = await database();
    await set(ref(db, `library/${uid}/${keyFor(item.id)}`), item);
}

export async function deleteDocumentRecord(uid: string, id: string): Promise<void> {
    const { ref, remove, db } = await database();
    await remove(ref(db, `library/${uid}/${keyFor(id)}`));
}
