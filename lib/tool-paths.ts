/**
 * Every route that is a tool.
 *
 * Kept apart from lib/tools.ts, which carries a name, a description and an icon
 * for each one. The navbar renders on every page and only needs to answer "is
 * this a tool page", so importing the full list would pull twenty icon
 * components into the bundle of every marketing page to decide one underline.
 *
 * The assertion below keeps the two in step: it runs outside production only,
 * so adding a tool without adding it here fails in development rather than
 * quietly leaving the nav unhighlighted on that page.
 */
export const TOOL_PATHS: readonly string[] = [
    "/merge-pdf",
    "/split-pdf",
    "/compress-pdf",
    "/rotate-pdf",
    "/pdf-to-word",
    "/word-to-pdf",
    "/pdf-to-image",
    "/image-to-pdf",
    "/pdf-to-excel",
    "/excel-to-pdf",
    "/pdf-to-ppt",
    "/ppt-to-pdf",
    "/watermark-pdf",
    "/sign-pdf",
    "/edit-pdf",
    "/protect-pdf",
    "/unlock-pdf",
    "/ocr-pdf",
    "/summarize-pdf",
    "/translate",
    "/grammar",
];

const TOOL_PATH_SET = new Set(TOOL_PATHS);

/** True for a tool's own page, and for the listing at /tools. */
export function isToolPath(pathname: string): boolean {
    return pathname === "/tools" || TOOL_PATH_SET.has(pathname);
}
