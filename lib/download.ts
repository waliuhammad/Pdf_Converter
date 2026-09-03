"use client";

/**
 * Hand a finished file to the browser.
 *
 * Every tool used to inline this, and every copy revoked the object URL on the
 * line after the click:
 *
 *     a.click();
 *     a.remove();
 *     URL.revokeObjectURL(url);   // same tick
 *
 * Clicking only *starts* a download. Desktop browsers read the blob quickly
 * enough that revoking immediately usually goes unnoticed, but a phone hands
 * the transfer to a separate download manager, which then finds the URL already
 * destroyed. The tool reports success, no error appears anywhere, and no file
 * arrives — which is exactly what "works on my laptop, does nothing on my
 * phone" looks like.
 *
 * So the URL is released on a timer instead, long after the browser has taken
 * what it needs. Leaking it for a minute costs one blob; releasing it too early
 * costs the download.
 */

/** Long enough for any real transfer to have started, short enough not to matter. */
const RELEASE_AFTER_MS = 60_000;

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);

    // Never synchronously: see above.
    setTimeout(() => URL.revokeObjectURL(url), RELEASE_AFTER_MS);
}

/**
 * The same, for a URL the caller already owns (an object URL it still needs, or
 * a remote file). The caller keeps responsibility for releasing it.
 */
export function downloadUrl(url: string, filename: string): void {
    triggerDownload(url, filename);
}

function triggerDownload(url: string, filename: string): void {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    // Some browsers ignore a click on an element that is not in the document.
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();

    // Removing the anchor is safe immediately — it is the object URL that has
    // to outlive the click, not the element.
    a.remove();
}
