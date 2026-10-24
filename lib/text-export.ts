"use client";

import { downloadBlob } from "@/lib/download";
import { loadJsPdf } from "@/lib/pdf-libs";

/**
 * Save an AI result (a summary, OCR text) as .txt or .pdf, built in the
 * browser — no extra request, and no extra operation counted.
 */
export interface TextExport {
    /** Heading at the top, e.g. "AI Summary". */
    title: string;
    /** The uploaded file's name, shown under the heading and used for the download name. */
    sourceName: string;
    /** Suffix for the download name: "report.pdf" + "summary" -> "report-summary.txt". */
    suffix: string;
    /** Bullet points, or the text itself (line breaks are kept). */
    content: { bullets: string[] } | { text: string };
}

function baseName(e: TextExport): string {
    return `${e.sourceName.replace(/\.[^/.]+$/, "") || "document"}-${e.suffix}`;
}

function bodyLines(e: TextExport): string[] {
    return "bullets" in e.content ? e.content.bullets.map((b) => `• ${b}`) : e.content.text.split(/\r?\n/);
}

export function downloadAsTxt(e: TextExport): void {
    const text = [e.title, `Source: ${e.sourceName}`, `Created: ${new Date().toLocaleString()}`, "", ...bodyLines(e), ""].join("\r\n");
    downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${baseName(e)}.txt`);
}

/**
 * The standard PDF fonts only cover Latin-1, so the typographic characters
 * models like (curly quotes, dashes, ellipses, bullets) become plain ones and
 * anything else outside Latin-1 is dropped rather than drawn as garbage.
 */
function latin1(text: string): string {
    return text
        .replace(/[‘’‚′]/g, "'")
        .replace(/[“”„″]/g, '"')
        .replace(/[–—−]/g, "-")
        .replace(/…/g, "...")
        .replace(/[•●▪]/g, "-")
        .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "");
}

/** True when the text uses a script the built-in PDF fonts cannot draw (Urdu, Chinese, …). */
export function needsUnicodeFont(e: TextExport): boolean {
    return /[^\x09\x0A\x0D\x20-\xFF‘-„•…–—′″−▪●]/.test(bodyLines(e).join("\n"));
}

/**
 * Text in other scripts (Urdu, Arabic, Hindi, Chinese…) is made into a PDF on
 * the server, which embeds a real font and joins the letters properly; the
 * browser's standard PDF fonts cannot draw it.
 */
async function downloadViaServer(e: TextExport): Promise<void> {
    const res = await fetch("/api/text-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: e.title,
            sourceName: e.sourceName,
            fileName: `${baseName(e)}.pdf`,
            ...("bullets" in e.content ? { bullets: e.content.bullets } : { text: e.content.text }),
        }),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not create the PDF.");
    }
    downloadBlob(await res.blob(), `${baseName(e)}.pdf`);
}

export async function downloadAsPdf(e: TextExport): Promise<void> {
    if (needsUnicodeFont(e)) return downloadViaServer(e);

    const { jsPDF } = await loadJsPdf();
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 56;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    const bottom = doc.internal.pageSize.getHeight() - margin;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(20);
    doc.text(latin1(e.title), margin, y);
    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(latin1(`Source: ${e.sourceName}`), margin, y);
    y += 14;
    doc.text(`Created: ${new Date().toLocaleString()}`, margin, y);
    y += 26;

    doc.setTextColor(20);
    doc.setFontSize(12);
    const lineHeight = 17;
    const bullets = "bullets" in e.content;
    const blocks = bullets ? (e.content as { bullets: string[] }).bullets : bodyLines(e);
    const indent = bullets ? 16 : 0;

    for (const block of blocks) {
        const lines: string[] = block.trim() ? doc.splitTextToSize(latin1(block), width - indent) : [""];
        for (let i = 0; i < lines.length; i++) {
            if (y > bottom) {
                doc.addPage();
                y = margin;
            }
            if (bullets && i === 0) doc.text("-", margin, y);
            doc.text(lines[i], margin + indent, y);
            y += lineHeight;
        }
        if (bullets) y += 6;
    }

    downloadBlob(doc.output("blob"), `${baseName(e)}.pdf`);
}
