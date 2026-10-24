import "server-only";
import { PDFDocument, rgb } from "pdf-lib";
import { readTextLayout, stripPdfText, type PageText, type TextLine } from "@/lib/pdf-layout";
import { drawLine, embedFontsFor, isRtlText, lineWidth } from "@/lib/unicode-pdf-text";

const AI_SERVICE = process.env.AI_SERVICE_URL || "http://localhost:8001";

const RTL_LANGUAGES = new Set([
    "arabic",
    "urdu",
    "persian",
    "farsi",
    "hebrew",
    "pashto",
    "yiddish",
    "sindhi",
    "uyghur",
]);

export function isRtl(language: string): boolean {
    const l = language.trim().toLowerCase();
    for (const rtl of RTL_LANGUAGES) {
        if (l.includes(rtl)) return true;
    }
    return false;
}

/**
 * Call the AI service to translate lines for a single page or batch.
 */
async function translateLineBatch(lines: string[], language: string): Promise<string[]> {
    if (lines.length === 0) return [];

    try {
        const response = await fetch(`${AI_SERVICE}/api/translate/lines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language,
                lines,
            }),
            signal: AbortSignal.timeout(90000),
        });

        if (!response.ok) {
            console.error("AI service translation returned error status:", response.status);
            return lines;
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.translatedLines) && data.translatedLines.length > 0) {
            return data.translatedLines;
        }
    } catch (err) {
        console.error("Failed to translate line batch:", err);
    }

    return lines;
}

/**
 * Translates a PDF document while preserving 100% of its visual design:
 * - Images, logos, vector drawings, tables, and borders stay untouched.
 * - Background colors, page sizes, page counts, and layout stay untouched.
 * - Only the text is translated and placed inside the exact bounding boxes.
 */
export async function translatePdfDocument(
    pdfBytes: Uint8Array,
    targetLanguage: string
): Promise<Uint8Array> {
    // 1. Read layout of each page with bounding boxes, colors, font sizes
    let pages: PageText[] = [];
    try {
        pages = await readTextLayout(pdfBytes);
    } catch (err) {
        console.warn("readTextLayout failed, returning original PDF:", err);
        return pdfBytes;
    }

    if (pages.length === 0) {
        return pdfBytes;
    }

    // 2. Check for scanned PDF (no selectable text on any page)
    const totalLines = pages.reduce((acc, p) => acc + p.lines.length, 0);
    if (totalLines === 0) {
        console.log("No selectable text detected in PDF, attempting OCR fallback...");
        try {
            const formData = new FormData();
            formData.append("file", new Blob([Buffer.from(pdfBytes)], { type: "application/pdf" }), "document.pdf");
            const ocrRes = await fetch(`${AI_SERVICE}/api/ocr`, {
                method: "POST",
                body: formData,
                signal: AbortSignal.timeout(60000),
            });
            if (ocrRes.ok) {
                const ocrData = await ocrRes.json();
                const rawText: string = ocrData?.result?.text || "";
                if (rawText.trim()) {
                    const ocrLines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
                    // Place OCR lines evenly on page 1
                    const firstPage = pages[0];
                    if (firstPage) {
                        const lineHeight = 16;
                        firstPage.lines = ocrLines.map((t, idx) => ({
                            text: t,
                            x: 50,
                            top: 50 + idx * lineHeight,
                            width: firstPage.widthPt - 100,
                            size: 11,
                            font: "Arial",
                            bold: false,
                            italic: false,
                            color: "000000",
                        }));
                    }
                }
            }
        } catch (ocrErr) {
            console.warn("OCR fallback attempt failed:", ocrErr);
        }
    }

    // 3. Batch translate lines per page
    const pageTranslatedLines: string[][] = [];
    for (const page of pages) {
        if (page.lines.length === 0) {
            pageTranslatedLines.push([]);
            continue;
        }

        const linesText = page.lines.map((l) => l.text);
        const translated = await translateLineBatch(linesText, targetLanguage);
        pageTranslatedLines.push(translated);
    }

    // 4. Strip original text from the PDF content streams
    // This removes 'BT ... ET' operators while keeping every image, logo, background,
    // table border, vector stroke, and geometry 100% intact!
    let strippedBytes: Uint8Array;
    try {
        strippedBytes = await stripPdfText(pdfBytes);
    } catch (stripErr) {
        console.warn("stripPdfText failed, falling back to original PDF as base:", stripErr);
        strippedBytes = pdfBytes;
    }

    // 5. Load the stripped PDF and embed a font chosen from the translated
    // text itself (its script), not from the language name.
    const pdfDoc = await PDFDocument.load(strippedBytes, { ignoreEncryption: true });
    const sample = pageTranslatedLines.flat().join(" ");
    const fonts = await embedFontsFor(pdfDoc, sample);
    const isRtlLang = isRtl(targetLanguage) || isRtlText(sample);
    const docPages = pdfDoc.getPages();

    // 6. Draw translated text back onto each page inside the exact bounding boxes
    for (let pageIdx = 0; pageIdx < docPages.length; pageIdx++) {
        const docPage = docPages[pageIdx];
        const pageLayout = pages[pageIdx];
        const translatedLines = pageTranslatedLines[pageIdx];
        if (!pageLayout || !translatedLines) continue;

        const pageHeight = docPage.getHeight();
        const pageWidth = docPage.getWidth();

        for (let lineIdx = 0; lineIdx < pageLayout.lines.length; lineIdx++) {
            const origLine: TextLine = pageLayout.lines[lineIdx];
            let text = translatedLines[lineIdx] ?? origLine.text;
            if (!text || !text.trim()) continue;

            // No pre-shaping or reversing here: drawLine hands the text to
            // fontkit in reading order, which joins Arabic-script letters, and
            // keeps digits / Latin words inside RTL text the right way round.
            text = text.replace(/\s+/g, " ").trim();

            // Calculate auto-shrunk font size so it fits the bounding box without overflowing
            let fontSize = origLine.size && origLine.size > 0 ? origLine.size : 12;
            const minFontSize = Math.max(5, fontSize * 0.55);

            let textWidth: number;
            try {
                textWidth = lineWidth(fonts, text, fontSize);
            } catch {
                // If character cannot be measured in font, skip drawing that line to avoid crash
                continue;
            }

            const maxAllowedWidth =
                origLine.width > 10 ? origLine.width * 1.15 : pageWidth - origLine.x - 20;

            if (textWidth > maxAllowedWidth && maxAllowedWidth > 10) {
                fontSize = Math.max(minFontSize, (maxAllowedWidth / textWidth) * fontSize);
                try {
                    textWidth = lineWidth(fonts, text, fontSize);
                } catch {
                    continue;
                }
            }

            // Align text: if RTL, right-align within the original bounding box
            let xPos = origLine.x;
            if (isRtlLang && isRtlText(text)) {
                const rightBoundary = origLine.x + origLine.width;
                xPos = Math.max(10, Math.min(pageWidth - textWidth - 10, rightBoundary - textWidth));
            }

            // pdf-lib origin is bottom-left
            const yPos = pageHeight - origLine.top - fontSize * 0.85;

            // Parse color
            const hexColor = origLine.color || "000000";
            const r = parseInt(hexColor.slice(0, 2), 16) / 255;
            const g = parseInt(hexColor.slice(2, 4), 16) / 255;
            const b = parseInt(hexColor.slice(4, 6), 16) / 255;

            try {
                drawLine(docPage, fonts, text, {
                    x: Math.max(0, xPos),
                    y: Math.max(0, yPos),
                    size: fontSize,
                    color: rgb(isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b),
                });
            } catch (drawErr) {
                console.warn("Could not draw text run:", drawErr);
            }
        }
    }

    return pdfDoc.save({ useObjectStreams: false });
}
