/**
 * The largest file a tool accepts, shared by the browser (UploadCard) and the
 * server (rejectBadUpload) so both say the same thing.
 *
 * 25 MB by default. Hosts that cap request bodies need it lower — Vercel's
 * functions accept 4.5 MB — so it is set per deployment with
 * NEXT_PUBLIC_MAX_UPLOAD_MB (e.g. 4 on Vercel). Checking in the browser
 * matters there: an oversized upload never reaches the route, Vercel answers
 * it with its own 413 page, and the user would see a generic failure.
 */
const configured = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);
const MB = Number.isFinite(configured) && configured > 0 ? configured : 25;

export const MAX_UPLOAD_BYTES = Math.floor(MB * 1024 * 1024);
export const MAX_UPLOAD_LABEL = `${MB} MB`;

/** A message for a file over the limit, or null when it fits. */
export function tooLargeMessage(file: { name: string; size: number }): string | null {
    if (file.size <= MAX_UPLOAD_BYTES) return null;
    const size = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${size} MB. The limit is ${MAX_UPLOAD_LABEL} — please compress it or split it first.`;
}
