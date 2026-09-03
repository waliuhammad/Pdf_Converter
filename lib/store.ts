"use client";

import { create } from "zustand";
import { formatFileSize } from "@/lib/utils";
import { deleteDocumentRecord, saveDocumentRecord } from "@/lib/firebase/library";

/**
 * Client-side library of the user's documents.
 *
 * This remains the single source of truth the documents and dashboard
 * pages read from — but it is now backed by Firestore: `hydrate` fills
 * it from users/{uid}/... on sign-in (see LibraryLoader), and every
 * mutation writes through to the same records.
 *
 * Writes are optimistic: the UI updates immediately and the Firestore
 * write follows. A failed write is logged rather than surfaced —
 * losing one history record beats blocking someone's actual work.
 */

export interface DocumentItem {
    id: string;
    name: string;
    /** Formatted for display, e.g. "2.4 MB". */
    size: string;
    /** Megabytes, kept separately so the list can sort by size. */
    sizeMb: number;
    timestamp: number;
    favorite: boolean;
}

interface LibraryState {
    /** The signed-in user everything is persisted under; null = signed out. */
    uid: string | null;

    documents: DocumentItem[];

    /** Called by LibraryLoader on sign-in/out. */
    hydrate: (uid: string | null, documents: DocumentItem[]) => void;

    addDocuments: (files: { name: string; bytes: number }[]) => void;
    removeDocument: (id: string) => void;
    renameDocument: (id: string, name: string) => void;
    toggleFavorite: (id: string) => void;
}

/** Fire-and-forget persistence: log failures, never block the UI. */
function persist(operation: Promise<void>, what: string) {
    operation.catch((err) => console.error(`Failed to save ${what}:`, err));
}

export const useLibrary = create<LibraryState>((set) => ({
    uid: null,
    documents: [],

    hydrate: (uid, documents) => set({ uid, documents }),

    addDocuments: (files) =>
        set((state) => {
            const now = Date.now();
            const added: DocumentItem[] = files.map((f, i) => ({
                id: `doc-${now}-${i}`,
                name: f.name,
                size: formatFileSize(f.bytes),
                sizeMb: f.bytes / (1024 * 1024),
                timestamp: now,
                favorite: false,
            }));

            if (state.uid) {
                const uid = state.uid;
                added.forEach((item) =>
                    persist(saveDocumentRecord(uid, item), `document "${item.name}"`)
                );
            }

            return { documents: [...added, ...state.documents] };
        }),

    removeDocument: (id) =>
        set((state) => {
            if (state.uid) persist(deleteDocumentRecord(state.uid, id), "document removal");
            return { documents: state.documents.filter((d) => d.id !== id) };
        }),

    renameDocument: (id, name) =>
        set((state) => {
            const documents = state.documents.map((d) => (d.id === id ? { ...d, name } : d));
            const changed = documents.find((d) => d.id === id);
            if (state.uid && changed) persist(saveDocumentRecord(state.uid, changed), "rename");
            return { documents };
        }),

    toggleFavorite: (id) =>
        set((state) => {
            const documents = state.documents.map((d) =>
                d.id === id ? { ...d, favorite: !d.favorite } : d
            );
            const changed = documents.find((d) => d.id === id);
            if (state.uid && changed) persist(saveDocumentRecord(state.uid, changed), "favorite");
            return { documents };
        }),
}));
