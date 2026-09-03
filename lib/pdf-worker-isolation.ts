/**
 * Keeps two pdf.js versions from breaking each other inside one server process.
 *
 * This app ends up with two copies. The root dependency is pdfjs-dist 3.11.174,
 * used by pdf-to-word; pdf-to-png-converter bundles its own 6.2.108, used by
 * pdf-to-image. Both are fine on their own.
 *
 * The problem is that every version of pdf.js caches its worker on the same
 * global — `globalThis.pdfjsWorker` — and reuses whatever it finds there
 * without checking where it came from. So the first route to run plants its
 * worker, the second picks up the wrong one, and the version assertion fires:
 *
 *     The API version "3.11.174" does not match the Worker version "6.2.108"
 *
 * It is order-dependent and permanent for the life of the process. Convert a
 * PDF to an image and pdf-to-word is broken until the server restarts; do it
 * the other way round and pdf-to-image is broken instead. A dev server hides
 * this because it reloads constantly. A production server does not.
 *
 * Clearing the global before each use makes each library set up its own worker.
 * The re-import costs nothing after the first time — Node's module cache still
 * holds it — and the previous value is put back so nothing else is disturbed.
 */

type WithWorker = typeof globalThis & { pdfjsWorker?: unknown };

export async function withOwnPdfWorker<T>(run: () => Promise<T>): Promise<T> {
    const holder = globalThis as WithWorker;
    const previous = holder.pdfjsWorker;
    const had = "pdfjsWorker" in holder;

    delete holder.pdfjsWorker;
    try {
        return await run();
    } finally {
        // Leave the global exactly as it was found, including absent.
        if (had) holder.pdfjsWorker = previous;
        else delete holder.pdfjsWorker;
    }
}
