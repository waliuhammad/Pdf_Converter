import "server-only";
import { withOwnPdfWorker } from "./pdf-worker-isolation";

/**
 * Page-wise lines of text, read with pdf.js.
 *
 * pdf2json, which pdf-to-ppt and pdf-to-excel used, fails on every PDF in this
 * install — including one it produced itself — with "Invalid XRef stream
 * header", so both tools returned an error for any input. pdf.js already reads
 * PDFs elsewhere in the app (pdf-to-word, pdf-to-image), so the extraction is
 * shared here rather than a second parser being kept alive for two routes.
 *
 * Lines are rebuilt from the text items' baselines: pdf.js reports each run
 * with its transform, and runs sharing a baseline belong to the same visual
 * line. That is what the old parser's row map was doing with its y buckets.
 */
/** One text run with the position pdf.js reported for it. */
export interface TextCell {
    x: number;
    y: number;
    width: number;
    size: number;
    text: string;
}

/**
 * The same bucketing as extractPageLines, but each run is kept separate so a
 * caller can treat them as cells. A table reader needs the column boundaries
 * that joining a row into one string throws away.
 */
export async function extractPageCells(bytes: Uint8Array): Promise<TextCell[][][]> {
    return readPages(bytes, (rows) =>
        [...rows.keys()]
            .sort((a, b) => b - a)
            .map((y) => rows.get(y)!.sort((a, b) => a.x - b.x))
    );
}

/**
 * Opens the document once and hands each page's baseline buckets to `shape`,
 * so the two public extractors differ only in what they build from a row.
 */
async function readPages<T>(
    bytes: Uint8Array,
    shape: (rows: Map<number, TextCell[]>) => T
): Promise<T[]> {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.js");

    let pdf;
    try {
        // Isolated, because another pdf.js major runs in this same process and
        // the two share a worker global. See the helper.
        pdf = await withOwnPdfWorker(() =>
            getDocument({
                // pdf.js takes ownership of the array it is handed.
                data: new Uint8Array(bytes),
                isEvalSupported: false,
                useSystemFonts: true,
            }).promise
        );
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`That file could not be read as a PDF: ${reason}`);
    }

    try {
        const pages: T[] = [];

        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();

            // Bucket by baseline, rounded so runs a fraction of a point apart
            // still land on the same line, then order left to right within it.
            const rows = new Map<number, TextCell[]>();

            for (const item of content.items) {
                if (!("str" in item)) continue;
                const text = item.str
                    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
                    .trim();
                if (!text) continue;

                // transform is [a, b, c, d, e, f]: e is x, f is the baseline y.
                const x = item.transform?.[4] ?? 0;
                const y = Math.round((item.transform?.[5] ?? 0) * 2) / 2;
                const size = Math.hypot(item.transform?.[0] ?? 0, item.transform?.[1] ?? 0);
                const width = item.width ?? 0;

                const row = rows.get(y);
                if (row) row.push({ x, y, width, size, text });
                else rows.set(y, [{ x, y, width, size, text }]);
            }

            pages.push(shape(rows));
            page.cleanup();
        }

        return pages;
    } finally {
        await pdf.destroy();
    }
}

export async function extractPageLines(bytes: Uint8Array): Promise<string[][]> {
    return readPages(bytes, (rows) =>
        // Descending: PDF y grows upward, so the top of the page comes first.
        [...rows.keys()]
            .sort((a, b) => b - a)
            .map((y) =>
                rows
                    .get(y)!
                    .sort((a, b) => a.x - b.x)
                    .map((i) => i.text)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim()
            )
            .filter(Boolean)
    );
}
