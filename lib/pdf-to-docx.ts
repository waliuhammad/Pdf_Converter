import JSZip from "jszip";
import { withOwnPdfWorker } from "./pdf-worker-isolation";

/**
 * Turn a PDF into a .docx here, rather than posting the document to ConvertAPI.
 *
 * Same reasoning as lib/docx-to-pdf.ts: the route needed CONVERTAPI_SECRET and
 * answered 503 without it, so the tool did nothing, and every uploaded document
 * was sent to a third party. A .docx is a zip of XML, so we can write one.
 *
 * This recovers the document's text, its line and paragraph breaks, and its page
 * boundaries. A PDF does not record what was a heading or a table — that
 * information is thrown away when it is produced — so this cannot restore them.
 * It is a text-level conversion.
 */

const escapeXml = (text: string) =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        // Control characters are not legal in XML and Word refuses the file.
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");

const paragraph = (text: string, opts: { pageBreakBefore?: boolean } = {}) => {
    const props = opts.pageBreakBefore ? "<w:pPr><w:pageBreakBefore/></w:pPr>" : "";
    if (text === "") return `<w:p>${props}</w:p>`;
    return `<w:p>${props}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
};

export interface Line {
    text: string;
    /** Distance from the bottom of the page, in points. */
    y: number;
}

/**
 * pdf.js gives positioned fragments, not paragraphs, and a PDF has no blank
 * lines to mark where one ends — grouping on those alone merged every page into
 * a single blob.
 *
 * The gap between baselines is the signal that survives. Lines a normal
 * line-height apart belong together; a noticeably larger gap is a new
 * paragraph. The threshold comes from the document's own median spacing, so it
 * holds whatever the font size.
 */
export function groupIntoParagraphs(lines: Line[]): string[] {
    const kept = lines.filter((l) => l.text.trim() !== "");
    if (kept.length === 0) return [];
    if (kept.length === 1) return [kept[0].text.trim()];

    const gaps: number[] = [];
    for (let i = 1; i < kept.length; i++) {
        const gap = kept[i - 1].y - kept[i].y;
        if (gap > 0) gaps.push(gap);
    }

    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
    // Half again as tall as a normal line reads as a deliberate break.
    const breakAt = median * 1.5;

    const paragraphs: string[] = [];
    let current = [kept[0].text.trim()];

    for (let i = 1; i < kept.length; i++) {
        const gap = kept[i - 1].y - kept[i].y;

        if (median > 0 && gap > breakAt) {
            paragraphs.push(current.join(" ").trim());
            current = [kept[i].text.trim()];
        } else {
            current.push(kept[i].text.trim());
        }
    }
    paragraphs.push(current.join(" ").trim());

    return paragraphs.filter((p) => p !== "");
}

/** The parts Word needs before it will open the file at all. */
function buildDocx(pages: string[][]): Promise<Uint8Array> {
    const body = pages
        .flatMap((paragraphs, pageIndex) =>
            paragraphs.length === 0
                ? [paragraph("", { pageBreakBefore: pageIndex > 0 })]
                : paragraphs.map((text, i) =>
                      paragraph(text, { pageBreakBefore: pageIndex > 0 && i === 0 })
                  )
        )
        .join("");

    const zip = new JSZip();

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
            `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
            `<Default Extension="xml" ContentType="application/xml"/>` +
            `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
            `</Types>`
    );

    zip.folder("_rels")!.file(
        ".rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
            `</Relationships>`
    );

    const word = zip.folder("word")!;
    word.file(
        "document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
            `<w:body>${body}` +
            // A4 with 1 inch margins, in twentieths of a point.
            `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>` +
            `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>` +
            `</w:body></w:document>`
    );
    word.folder("_rels")!.file(
        "document.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
            `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`
    );

    return zip
        .generateAsync({
            type: "uint8array",
            mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            compression: "DEFLATE",
        })
        .then((out) => out as Uint8Array);
}

export async function pdfToDocx(bytes: Uint8Array): Promise<Uint8Array> {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.js");

    let pdf;
    try {
        // Isolated, because pdf-to-image runs a different pdf.js major in this
        // same process and the two share a worker global. See the helper.
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
        const pages: string[][] = [];

        for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
            const page = await pdf.getPage(pageNo);
            const content = await page.getTextContent();

            const lines: Line[] = [];
            let line = "";
            let y: number | null = null;

            for (const item of content.items) {
                if (!("str" in item)) continue;
                // transform is [a, b, c, d, e, f]; f is the baseline's y.
                if (y === null) y = item.transform?.[5] ?? 0;
                line += item.str;
                if (item.hasEOL) {
                    lines.push({ text: line, y: y ?? 0 });
                    line = "";
                    y = null;
                }
            }
            if (line) lines.push({ text: line, y: y ?? 0 });

            pages.push(groupIntoParagraphs(lines));
            page.cleanup();
        }

        if (pages.every((p) => p.length === 0)) {
            throw new Error(
                "No text could be read from this PDF. If it is a scan, run it through the OCR tool first."
            );
        }

        return await buildDocx(pages);
    } finally {
        await pdf.destroy();
    }
}
