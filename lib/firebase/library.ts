"use client";

import { getDb } from "./client";
import type { DocumentItem } from "@/lib/store";

/**
 * Firestore persistence for the user's library.
 *
 * Everything lives under the user's own document — users/{uid}/documents —
 * which is exactly the shape the security rules protect: a signed-in user can
 * touch their own branch and nobody else's.
 *
 * getDb() resolves to Firestore asynchronously (the SDK is lazy-loaded so
 * pages that never touch the database don't ship it), so every function
 * awaits it before building references.
 *
 * The query helpers are imported the same way, for the same reason. They used
 * to be a plain top-level import, which quietly undid the lazy loading: this
 * module is reached from lib/store, which the (app) layout mounts, so every
 * visitor to any of the tool pages downloaded the whole Firestore SDK —
 * including signed-out ones, who have no library to load.
 *
 * Records keep the same field shapes as the in-memory store (numeric
 * timestamps included), so the store and pages don't translate anything;
 * they just gain persistence.
 */

/** The SDK and the database together, both resolved on first use. */
async function firestore() {
    const [sdk, db] = await Promise.all([import("firebase/firestore"), getDb()]);
    return { ...sdk, db };
}

/** Everything at once: one read on sign-in fills the whole library. */
export async function loadLibrary(
    uid: string
): Promise<{ documents: DocumentItem[] }> {
    const { collection, getDocs, db } = await firestore();

    const docsSnap = await getDocs(collection(db, "users", uid, "documents"));

    const documents = docsSnap.docs
        .map((d) => d.data() as DocumentItem)
        .sort((a, b) => b.timestamp - a.timestamp);

    return { documents };
}

export async function saveDocumentRecord(uid: string, item: DocumentItem): Promise<void> {
    const { doc, setDoc, db } = await firestore();
    await setDoc(doc(db, "users", uid, "documents", item.id), item);
}

export async function deleteDocumentRecord(uid: string, id: string): Promise<void> {
    const { doc, deleteDoc, db } = await firestore();
    await deleteDoc(doc(db, "users", uid, "documents", id));
}
