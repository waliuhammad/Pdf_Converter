import "server-only";
import fs from "fs";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readTextLayout, stripPdfText, type PageText, type TextLine } from "@/lib/pdf-layout";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ArabicShaper } = require("arabic-persian-reshaper");

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
 * Reshape cursive Arabic / Urdu characters into their correct contextual forms
 * (isolated, initial, medial, final) and re-order for Left-to-Right PDF text painters.
 */
function reshapeRtlText(text: string): string {
    if (!/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
        return text;
    }

    try {
        const shaped = ArabicShaper.convertArabic(text);
        const tokens: { text: string; isRtl: boolean }[] = [];
        const regex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(shaped)) !== null) {
            const isArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(match[0]);
            tokens.push({ text: match[0], isRtl: isArabic });
        }

        return tokens
            .reverse()
            .map((tok) => (tok.isRtl ? tok.text.split("").reverse().join("") : tok.text))
            .join("");
    } catch {
        return text;
    }
}

/**
 * Locate a system Unicode TrueType font that supports the target script.
 */
function findFontFileForLanguage(language: string): string | null {
    const l = language.trim().toLowerCase();

    const candidates: string[] = [];

    if (isRtl(language)) {
        candidates.push(
            "C:\\Windows\\Fonts\\tahoma.ttf",
            "C:\\Windows\\Fonts\\segoeui.ttf",
            "C:\\Windows\\Fonts\\arial.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
            "/usr/share/fonts/opentype/noto/NotoSansArabic-Regular.otf",
            "/System/Library/Fonts/GeezaPro.ttc"
        );
    } else if (
        l.includes("hindi") ||
        l.includes("marathi") ||
        l.includes("sanskrit") ||
        l.includes("nepali") ||
        l.includes("bengali") ||
        l.includes("tamil") ||
        l.includes("telugu") ||
        l.includes("kannada") ||
        l.includes("gujarati") ||
        l.includes("punjabi") ||
        l.includes("malayalam")
    ) {
        candidates.push(
            "C:\\Windows\\Fonts\\nirmala.ttf",
            "C:\\Windows\\Fonts\\arial.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
            "/System/Library/Fonts/KohinoorBangla.ttc"
        );
    } else if (l.includes("chinese") || l.includes("mandarin") || l.includes("taiwanese")) {
        candidates.push(
            "C:\\Windows\\Fonts\\msyh.ttc",
            "C:\\Windows\\Fonts\\simsun.ttc",
            "C:\\Windows\\Fonts\\arial.ttf",
            "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc"
        );
    } else if (l.includes("japanese")) {
        candidates.push(
            "C:\\Windows\\Fonts\\msgothic.ttc",
            "C:\\Windows\\Fonts\\meiryo.ttc",
            "C:\\Windows\\Fonts\\arial.ttf"
        );
    } else if (l.includes("korean")) {
        candidates.push(
            "C:\\Windows\\Fonts\\malgun.ttf",
            "C:\\Windows\\Fonts\\arial.ttf"
        );
    }

    // Default Latin / Cyrillic / Greek / General Unicode fallback candidates
    candidates.push(
        "C:\\Windows\\Fonts\\arial.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/System/Library/Fonts/Helvetica.ttc"
    );

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }

    return null;
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

    // 5. Load the stripped PDF in pdf-lib and embed font
    const pdfDoc = await PDFDocument.load(strippedBytes, { ignoreEncryption: true });
    pdfDoc.registerFontkit(fontkit);

    let font: PDFFont;
    const fontFilePath = findFontFileForLanguage(targetLanguage);

    if (fontFilePath && fs.existsSync(fontFilePath)) {
        try {
            const fontBytes = fs.readFileSync(fontFilePath);
            font = await pdfDoc.embedFont(fontBytes, { subset: true });
        } catch (fontErr) {
            console.warn(`Could not embed font from ${fontFilePath}:`, fontErr);
            font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
        }
    } else {
        font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
    }

    const isRtlLang = isRtl(targetLanguage);
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

            // Handle RTL shaping & character re-ordering for Arabic / Urdu
            if (isRtlLang) {
                text = reshapeRtlText(text);
            }

            // Calculate auto-shrunk font size so it fits the bounding box without overflowing
            let fontSize = origLine.size && origLine.size > 0 ? origLine.size : 12;
            const minFontSize = Math.max(5, fontSize * 0.55);

            let textWidth: number;
            try {
                textWidth = font.widthOfTextAtSize(text, fontSize);
            } catch {
                // If character cannot be measured in font, skip drawing that line to avoid crash
                continue;
            }

            const maxAllowedWidth =
                origLine.width > 10 ? origLine.width * 1.15 : pageWidth - origLine.x - 20;

            if (textWidth > maxAllowedWidth && maxAllowedWidth > 10) {
                fontSize = Math.max(minFontSize, (maxAllowedWidth / textWidth) * fontSize);
                try {
                    textWidth = font.widthOfTextAtSize(text, fontSize);
                } catch {
                    continue;
                }
            }

            // Align text: if RTL, right-align within the original bounding box
            let xPos = origLine.x;
            if (isRtlLang) {
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
                docPage.drawText(text, {
                    x: Math.max(0, xPos),
                    y: Math.max(0, yPos),
                    size: fontSize,
                    font,
                    color: rgb(
                        isNaN(r) ? 0 : r,
                        isNaN(g) ? 0 : g,
                        isNaN(b) ? 0 : b
                    ),
                });
            } catch (drawErr) {
                console.warn("Could not draw text run:", drawErr);
            }
        }
    }

    return pdfDoc.save({ useObjectStreams: false });
}
