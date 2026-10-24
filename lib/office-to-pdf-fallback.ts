import fs from "fs";
import path from "path";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { XMLParser } from "fast-xml-parser";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

import { createRequire } from "module";
const customRequire = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ArabicShaper } = customRequire("arabic-persian-reshaper");

const PAGE_A4_PORTRAIT = { width: 595.28, height: 841.89 };
const PAGE_A4_LANDSCAPE = { width: 841.89, height: 595.28 };
const MARGIN = 48;

/**
 * Reshape RTL characters (Urdu/Arabic/Farsi) for left-to-right PDF rendering.
 */
function reshapeRtlText(text: string): string {
    if (!/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
        return text;
    }
    try {
        const shaped = ArabicShaper.convertArabic(text);
        const tokens: { text: string; isRtl: boolean }[] = [];
        const regex =
            /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+)/g;
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
 * Replace unprintable or WinAnsi-incompatible characters if using standard Helvetica.
 */
function toWinAnsiSafe(text: string): string {
    return text
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...")
        .replace(/ /g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

interface FontSet {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    isUnicode: boolean;
}

/**
 * Load system TrueType font for full Unicode support (Urdu, Arabic, CJK, Cyrillic, Latin),
 * or fall back to standard Helvetica if no system font is present.
 */
async function loadFonts(pdfDoc: PDFDocument, sampleText?: string): Promise<FontSet> {
    pdfDoc.registerFontkit(fontkit);

    const isUrduOrArabic = sampleText
        ? /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(sampleText)
        : false;

    // Prioritize Tahoma for Urdu/Arabic on Windows, Arial / Segoe / DejaVu for others
    const candidates = isUrduOrArabic
        ? [
              "C:\\Windows\\Fonts\\tahoma.ttf",
              "C:\\Windows\\Fonts\\arial.ttf",
              "C:\\Windows\\Fonts\\segoeui.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
          ]
        : [
              "C:\\Windows\\Fonts\\arial.ttf",
              "C:\\Windows\\Fonts\\tahoma.ttf",
              "C:\\Windows\\Fonts\\segoeui.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
              "/System/Library/Fonts/Supplemental/Arial.ttf",
          ];

    const boldCandidates = [
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\tahomabd.ttf",
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ];

    const italicCandidates = [
        "C:\\Windows\\Fonts\\ariali.ttf",
        "C:\\Windows\\Fonts\\segoeuii.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
    ];

    const regularPath = candidates.find((p) => fs.existsSync(p));

    if (regularPath) {
        try {
            const regBytes = fs.readFileSync(regularPath);
            const regular = await pdfDoc.embedFont(regBytes, { subset: true });

            const boldPath = boldCandidates.find((p) => fs.existsSync(p));
            const bold = boldPath
                ? await pdfDoc.embedFont(fs.readFileSync(boldPath), { subset: true }).catch(() => regular)
                : regular;

            const italicPath = italicCandidates.find((p) => fs.existsSync(p));
            const italic = italicPath
                ? await pdfDoc.embedFont(fs.readFileSync(italicPath), { subset: true }).catch(() => regular)
                : regular;

            return { regular, bold, italic, isUnicode: true };
        } catch (fontErr) {
            console.warn("Failed to embed system font:", fontErr);
        }
    }

    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    return { regular, bold, italic, isUnicode: false };
}

function sanitizeText(text: string, isUnicode: boolean): string {
    if (isUnicode) {
        return reshapeRtlText(text);
    }
    return toWinAnsiSafe(text);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    if (!text) return [""];
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];

    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        let width = 0;
        try {
            width = font.widthOfTextAtSize(candidate, size);
        } catch {
            width = candidate.length * size * 0.55;
        }

        if (width <= maxWidth) {
            currentLine = candidate;
        } else {
            if (currentLine) lines.push(currentLine);
            let rest = word;
            while (rest.length > 0) {
                let restWidth = 0;
                try {
                    restWidth = font.widthOfTextAtSize(rest, size);
                } catch {
                    restWidth = rest.length * size * 0.55;
                }
                if (restWidth <= maxWidth || rest.length <= 1) {
                    currentLine = rest;
                    break;
                }
                let cut = rest.length;
                while (cut > 1) {
                    const slice = rest.slice(0, cut);
                    let sliceWidth = 0;
                    try {
                        sliceWidth = font.widthOfTextAtSize(slice, size);
                    } catch {
                        sliceWidth = slice.length * size * 0.55;
                    }
                    if (sliceWidth <= maxWidth) break;
                    cut--;
                }
                lines.push(rest.slice(0, cut));
                rest = rest.slice(cut);
            }
        }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [""];
}

// ============================================================================
// 1. WORD (.docx, .doc) TO PDF FALLBACK
// ============================================================================

interface DocxRun {
    text: string;
    bold: boolean;
    italic: boolean;
}

interface DocxParagraph {
    type: "paragraph";
    runs: DocxRun[];
    size: number;
    heading: boolean;
    bullet: boolean;
}

interface DocxTableCell {
    text: string;
}

interface DocxTable {
    type: "table";
    rows: DocxTableCell[][];
}

type DocxElement = DocxParagraph | DocxTable;

const asArray = <T>(v: T | T[] | undefined): T[] =>
    v === undefined ? [] : Array.isArray(v) ? v : [v];

const HEADING_SIZES: Record<string, number> = {
    Title: 22,
    Heading1: 18,
    Heading2: 14,
    Heading3: 12,
};

function parseDocxElements(documentXml: string): DocxElement[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@",
        trimValues: false,
    });
    const doc = parser.parse(documentXml);
    const body = doc?.["w:document"]?.["w:body"];
    if (!body) return [];

    const elements: DocxElement[] = [];

    // Body can contain w:p (paragraphs) and w:tbl (tables)
    const rawParagraphs = asArray<Record<string, unknown>>(body["w:p"]);
    const rawTables = asArray<Record<string, unknown>>(body["w:tbl"]);

    // Process all paragraphs
    for (const p of rawParagraphs) {
        const pPr = p["w:pPr"] as Record<string, unknown> | undefined;
        const pStyle = pPr?.["w:pStyle"] as Record<string, unknown> | undefined;
        const styleId = String(pStyle?.["@w:val"] ?? "");
        const headingSize = HEADING_SIZES[styleId];
        const isBullet = Boolean(pPr?.["w:numPr"]);

        const runs: DocxRun[] = [];
        const rawRuns = asArray<Record<string, unknown>>(p["w:r"] as Record<string, unknown> | Record<string, unknown>[] | undefined);

        for (const r of rawRuns) {
            const rPr = r?.["w:rPr"] as Record<string, unknown> | undefined;
            const bold = Boolean(rPr && ("w:b" in rPr));
            const italic = Boolean(rPr && ("w:i" in rPr));

            const rawText = asArray<unknown>(r?.["w:t"]);
            for (const t of rawText) {
                const text = typeof t === "string" ? t : typeof t === "object" && t !== null && "#text" in t ? String((t as { "#text": unknown })["#text"]) : "";
                if (text) {
                    runs.push({ text, bold, italic });
                }
            }
            if (r && "w:tab" in r) {
                runs.push({ text: "    ", bold, italic });
            }
        }

        elements.push({
            type: "paragraph",
            runs,
            size: headingSize ?? 10.5,
            heading: headingSize !== undefined,
            bullet: isBullet,
        });
    }

    // Process tables if present
    for (const tbl of rawTables) {
        const rawRows = asArray<Record<string, unknown>>(tbl["w:tr"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
        const rows: DocxTableCell[][] = [];

        for (const r of rawRows) {
            const rawCells = asArray<Record<string, unknown>>(r["w:tc"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
            const cells: DocxTableCell[] = [];

            for (const c of rawCells) {
                const cellPs = asArray<Record<string, unknown>>(c["w:p"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
                const cellTexts: string[] = [];
                for (const cp of cellPs) {
                    const cRuns = asArray<Record<string, unknown>>(cp["w:r"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
                    for (const cr of cRuns) {
                        const ts = asArray<unknown>(cr?.["w:t"]);
                        for (const t of ts) {
                            const val = typeof t === "string" ? t : typeof t === "object" && t !== null && "#text" in t ? String((t as { "#text": unknown })["#text"]) : "";
                            if (val) cellTexts.push(val);
                        }
                    }
                }
                cells.push({ text: cellTexts.join(" ").trim() });
            }
            if (cells.length > 0) rows.push(cells);
        }

        if (rows.length > 0) {
            elements.push({ type: "table", rows });
        }
    }

    return elements;
}

export async function docxToPdfFallback(bytes: Uint8Array): Promise<Uint8Array> {
    let zip: JSZip | null = null;
    let documentXml: string | null = null;

    try {
        zip = await JSZip.loadAsync(bytes);
        const entry = zip.file("word/document.xml");
        if (entry) {
            documentXml = await entry.async("string");
        }
    } catch {
        // Might be older binary .doc format or raw text
    }

    const pdfDoc = await PDFDocument.create();
    const fonts = await loadFonts(pdfDoc, documentXml ?? "");

    const pageWidth = PAGE_A4_PORTRAIT.width;
    const pageHeight = PAGE_A4_PORTRAIT.height;
    const contentWidth = pageWidth - MARGIN * 2;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - MARGIN;

    const newPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - MARGIN;
    };

    if (documentXml) {
        const elements = parseDocxElements(documentXml);

        for (const el of elements) {
            if (el.type === "paragraph") {
                const para = el;
                const lineHeight = para.size * 1.4;

                if (para.runs.length === 0) {
                    y -= lineHeight;
                    if (y < MARGIN) newPage();
                    continue;
                }

                if (y - lineHeight < MARGIN) newPage();

                let fullText = para.runs.map((r) => r.text).join("");
                if (para.bullet) fullText = "• " + fullText;

                const isBold = para.heading || para.runs.some((r) => r.bold);
                const isItalic = para.runs.some((r) => r.italic);
                const font = isBold ? fonts.bold : isItalic ? fonts.italic : fonts.regular;

                const sanitized = sanitizeText(fullText, fonts.isUnicode);
                const lines = wrapText(sanitized, font, para.size, contentWidth);

                for (const line of lines) {
                    if (y - lineHeight < MARGIN) newPage();
                    try {
                        page.drawText(line, {
                            x: MARGIN,
                            y,
                            size: para.size,
                            font,
                            color: para.heading ? rgb(0.1, 0.15, 0.3) : rgb(0.12, 0.12, 0.14),
                        });
                    } catch {
                        // Safe fallback for un-renderable glyphs
                    }
                    y -= lineHeight;
                }

                y -= para.heading ? 8 : 4;
            } else if (el.type === "table") {
                const table = el;
                const colCount = Math.max(...table.rows.map((r) => r.length), 1);
                const colWidth = contentWidth / colCount;
                const cellPadding = 5;
                const rowHeight = 22;

                for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
                    const row = table.rows[rIdx];
                    if (y - rowHeight < MARGIN) newPage();

                    const isHeader = rIdx === 0;

                    for (let cIdx = 0; cIdx < colCount; cIdx++) {
                        const cell = row[cIdx];
                        const cellX = MARGIN + cIdx * colWidth;
                        const cellY = y - rowHeight;

                        // Draw cell box
                        page.drawRectangle({
                            x: cellX,
                            y: cellY,
                            width: colWidth,
                            height: rowHeight,
                            color: isHeader ? rgb(0.93, 0.95, 0.98) : rgb(1, 1, 1),
                            borderColor: rgb(0.8, 0.84, 0.9),
                            borderWidth: 0.8,
                        });

                        if (cell && cell.text) {
                            const font = isHeader ? fonts.bold : fonts.regular;
                            const text = sanitizeText(cell.text, fonts.isUnicode);
                            const lines = wrapText(text, font, 9, colWidth - cellPadding * 2);
                            if (lines[0]) {
                                try {
                                    page.drawText(lines[0], {
                                        x: cellX + cellPadding,
                                        y: cellY + 6,
                                        size: 9,
                                        font,
                                        color: isHeader ? rgb(0.1, 0.15, 0.3) : rgb(0.15, 0.15, 0.2),
                                    });
                                } catch {
                                    // ignore glyph error
                                }
                            }
                        }
                    }
                    y -= rowHeight;
                }
                y -= 8;
            }
        }
    } else {
        // Fallback for binary .doc or plain text: extract ASCII and UTF-8 strings
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        const rawContent = textDecoder.decode(bytes);
        const matches = rawContent.match(/[\w\s.,;:!?@#%&*()_+\-=[\]{}'"><\/\\|]{4,}/g) || ["Document content"];
        const cleanContent = matches.slice(0, 100).join("\n");

        const lines = cleanContent.split("\n");
        for (const line of lines) {
            if (y - 14 < MARGIN) newPage();
            const wrapped = wrapText(sanitizeText(line, fonts.isUnicode), fonts.regular, 10, contentWidth);
            for (const wl of wrapped) {
                if (y - 14 < MARGIN) newPage();
                page.drawText(wl, {
                    x: MARGIN,
                    y,
                    size: 10,
                    font: fonts.regular,
                    color: rgb(0.15, 0.15, 0.2),
                });
                y -= 14;
            }
        }
    }

    return pdfDoc.save();
}

// ============================================================================
// 2. POWERPOINT (.pptx, .ppt) TO PDF FALLBACK
// ============================================================================

interface SlideShape {
    text: string;
    isTitle: boolean;
}

interface SlideInfo {
    slideNum: number;
    shapes: SlideShape[];
}

async function parsePptxSlides(zip: JSZip): Promise<SlideInfo[]> {
    const slides: SlideInfo[] = [];
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });

    const slideFiles = Object.keys(zip.files)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, "")) || 0;
            const numB = parseInt(b.replace(/\D/g, "")) || 0;
            return numA - numB;
        });

    for (let i = 0; i < slideFiles.length; i++) {
        const file = zip.file(slideFiles[i]);
        if (!file) continue;

        const xmlString = await file.async("string");
        const parsed = parser.parse(xmlString);
        const spTree = parsed?.["p:sld"]?.["p:cSld"]?.["p:spTree"];
        if (!spTree) continue;

        const rawShapes = asArray<Record<string, unknown>>(spTree["p:sp"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
        const shapes: SlideShape[] = [];

        for (const sp of rawShapes) {
            const nvSpPr = sp["p:nvSpPr"] as Record<string, unknown> | undefined;
            const ph = nvSpPr?.["p:nvPr"] as Record<string, unknown> | undefined;
            const phType = String((ph?.["p:ph"] as Record<string, unknown> | undefined)?.["@type"] ?? "");
            const isTitle = phType === "title" || phType === "ctrTitle";

            const txBody = sp["p:txBody"] as Record<string, unknown> | undefined;
            if (!txBody) continue;

            const paragraphs = asArray<Record<string, unknown>>(txBody["a:p"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
            const shapeTexts: string[] = [];

            for (const p of paragraphs) {
                const runs = asArray<Record<string, unknown>>(p["a:r"] as Record<string, unknown> | Record<string, unknown>[] | undefined);
                for (const r of runs) {
                    const rawT = asArray<unknown>(r["a:t"]);
                    for (const t of rawT) {
                        const str = typeof t === "string" ? t : typeof t === "object" && t !== null && "#text" in t ? String((t as { "#text": unknown })["#text"]) : "";
                        if (str) shapeTexts.push(str);
                    }
                }
            }

            const combined = shapeTexts.join(" ").trim();
            if (combined) {
                shapes.push({ text: combined, isTitle });
            }
        }

        slides.push({
            slideNum: i + 1,
            shapes,
        });
    }

    return slides;
}

export async function pptxToPdfFallback(bytes: Uint8Array): Promise<Uint8Array> {
    let zip: JSZip | null = null;
    let slides: SlideInfo[] = [];

    try {
        zip = await JSZip.loadAsync(bytes);
        slides = await parsePptxSlides(zip);
    } catch {
        // Fallback for older .ppt binary format
    }

    const pdfDoc = await PDFDocument.create();
    const sampleText = slides.flatMap((s) => s.shapes.map((sh) => sh.text)).join(" ");
    const fonts = await loadFonts(pdfDoc, sampleText);

    const slideWidth = PAGE_A4_LANDSCAPE.width;
    const slideHeight = PAGE_A4_LANDSCAPE.height;

    if (slides.length === 0) {
        // Render single fallback presentation slide
        slides.push({
            slideNum: 1,
            shapes: [
                { text: "Presentation Document", isTitle: true },
                { text: "Slide content extracted and converted to PDF.", isTitle: false },
            ],
        });
    }

    for (const slide of slides) {
        const page = pdfDoc.addPage([slideWidth, slideHeight]);

        // Background card
        page.drawRectangle({
            x: 20,
            y: 20,
            width: slideWidth - 40,
            height: slideHeight - 40,
            color: rgb(0.98, 0.99, 1),
            borderColor: rgb(0.85, 0.88, 0.94),
            borderWidth: 1.5,
        });

        // Top accent line
        page.drawRectangle({
            x: 20,
            y: slideHeight - 26,
            width: slideWidth - 40,
            height: 6,
            color: rgb(0.2, 0.45, 0.9),
        });

        // Slide badge in bottom right corner
        const badge = `Slide ${slide.slideNum} of ${slides.length}`;
        try {
            page.drawText(badge, {
                x: slideWidth - 140,
                y: 35,
                size: 10,
                font: fonts.regular,
                color: rgb(0.5, 0.55, 0.65),
            });
        } catch {
            // ignore
        }

        let currentY = slideHeight - 75;
        const marginX = 60;
        const contentWidth = slideWidth - marginX * 2;

        const titleShape = slide.shapes.find((s) => s.isTitle) || slide.shapes[0];
        const bodyShapes = slide.shapes.filter((s) => s !== titleShape);

        // Draw Slide Title
        if (titleShape && titleShape.text) {
            const titleText = sanitizeText(titleShape.text, fonts.isUnicode);
            const titleLines = wrapText(titleText, fonts.bold, 22, contentWidth);
            for (const tl of titleLines) {
                try {
                    page.drawText(tl, {
                        x: marginX,
                        y: currentY,
                        size: 22,
                        font: fonts.bold,
                        color: rgb(0.1, 0.15, 0.3),
                    });
                } catch {
                    // ignore
                }
                currentY -= 28;
            }
            currentY -= 12;

            // Subtle divider
            page.drawLine({
                start: { x: marginX, y: currentY + 6 },
                end: { x: slideWidth - marginX, y: currentY + 6 },
                thickness: 1,
                color: rgb(0.88, 0.9, 0.95),
            });
            currentY -= 16;
        }

        // Draw Slide Body Blocks / Bullet Points
        for (const shape of bodyShapes) {
            if (!shape.text) continue;
            const text = "•  " + sanitizeText(shape.text, fonts.isUnicode);
            const lines = wrapText(text, fonts.regular, 13, contentWidth);

            for (const line of lines) {
                if (currentY < 60) break;
                try {
                    page.drawText(line, {
                        x: marginX + 10,
                        y: currentY,
                        size: 13,
                        font: fonts.regular,
                        color: rgb(0.2, 0.22, 0.28),
                    });
                } catch {
                    // ignore
                }
                currentY -= 19;
            }
            currentY -= 10;
        }
    }

    return pdfDoc.save();
}

// ============================================================================
// 3. EXCEL (.xlsx, .xls, .csv) TO PDF FALLBACK
// ============================================================================

export async function xlsxToPdfFallback(bytes: Uint8Array): Promise<Uint8Array> {
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const pdfDoc = await PDFDocument.create();

    const pageWidth = PAGE_A4_LANDSCAPE.width;
    const pageHeight = PAGE_A4_LANDSCAPE.height;
    const margin = 36;
    const availableWidth = pageWidth - margin * 2;

    const sheetNames = workbook.SheetNames || [];
    let sampleData = "";
    for (const name of sheetNames.slice(0, 2)) {
        const sheet = workbook.Sheets[name];
        if (sheet) {
            sampleData += JSON.stringify(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })).slice(0, 200);
        }
    }

    const fonts = await loadFonts(pdfDoc, sampleData);

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;

        const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
            defval: "",
        });

        // Filter empty rows
        const rows = rawRows.filter((r) => r && r.some((c) => String(c).trim() !== ""));
        if (rows.length === 0) continue;

        // Calculate max columns across rows (capped at 16 for readable page display)
        const totalCols = Math.min(Math.max(...rows.map((r) => r.length), 1), 16);
        const colWidth = availableWidth / totalCols;
        const rowHeight = 20;

        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;

        const drawSheetHeader = (pageNumber: number) => {
            // Sheet title banner
            page.drawRectangle({
                x: margin,
                y: y - 26,
                width: availableWidth,
                height: 26,
                color: rgb(0.18, 0.35, 0.65),
            });

            try {
                page.drawText(`Sheet: ${sanitizeText(sheetName, fonts.isUnicode)}`, {
                    x: margin + 12,
                    y: y - 18,
                    size: 11,
                    font: fonts.bold,
                    color: rgb(1, 1, 1),
                });

                page.drawText(`Page ${pageNumber}`, {
                    x: pageWidth - margin - 60,
                    y: y - 18,
                    size: 10,
                    font: fonts.regular,
                    color: rgb(0.9, 0.95, 1),
                });
            } catch {
                // ignore
            }

            y -= 34;
        };

        let sheetPageCount = 1;
        drawSheetHeader(sheetPageCount);

        const headerRow = rows[0] || [];

        const drawTableRow = (rowCells: unknown[], isHeader: boolean) => {
            const cellY = y - rowHeight;

            for (let cIdx = 0; cIdx < totalCols; cIdx++) {
                const cellVal = String(rowCells[cIdx] ?? "");
                const cellX = margin + cIdx * colWidth;

                // Cell background
                page.drawRectangle({
                    x: cellX,
                    y: cellY,
                    width: colWidth,
                    height: rowHeight,
                    color: isHeader ? rgb(0.91, 0.94, 0.98) : rgb(1, 1, 1),
                    borderColor: rgb(0.82, 0.85, 0.9),
                    borderWidth: 0.7,
                });

                if (cellVal.trim()) {
                    const font = isHeader ? fonts.bold : fonts.regular;
                    const text = sanitizeText(cellVal, fonts.isUnicode);
                    const cellPadding = 4;
                    const maxTextWidth = colWidth - cellPadding * 2;
                    const lines = wrapText(text, font, 8.5, maxTextWidth);

                    if (lines[0]) {
                        try {
                            page.drawText(lines[0], {
                                x: cellX + cellPadding,
                                y: cellY + 5.5,
                                size: 8.5,
                                font,
                                color: isHeader ? rgb(0.1, 0.15, 0.3) : rgb(0.15, 0.18, 0.22),
                            });
                        } catch {
                            // ignore
                        }
                    }
                }
            }
            y -= rowHeight;
        };

        // Draw header row
        drawTableRow(headerRow, true);

        // Draw data rows
        for (let rIdx = 1; rIdx < rows.length; rIdx++) {
            if (y - rowHeight < margin + 15) {
                // Next page
                page = pdfDoc.addPage([pageWidth, pageHeight]);
                y = pageHeight - margin;
                sheetPageCount++;
                drawSheetHeader(sheetPageCount);
                // Repeat table headers on new page
                drawTableRow(headerRow, true);
            }
            drawTableRow(rows[rIdx], false);
        }
    }

    if (pdfDoc.getPageCount() === 0) {
        // Ensure at least one page exists if spreadsheet was completely blank
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawText("Spreadsheet contains no data.", {
            x: margin,
            y: pageHeight - margin - 20,
            size: 12,
            font: fonts.regular,
            color: rgb(0.4, 0.4, 0.4),
        });
    }

    return pdfDoc.save();
}

// ============================================================================
// 4. MASTER OFFICE TO PDF FALLBACK DISPATCHER
// ============================================================================

export async function officeToPdfFallback(bytes: Uint8Array, extension: string): Promise<Uint8Array> {
    const ext = extension.toLowerCase().replace(/^\./, "").trim();

    if (ext === "docx" || ext === "doc") {
        return docxToPdfFallback(bytes);
    }
    if (ext === "pptx" || ext === "ppt") {
        return pptxToPdfFallback(bytes);
    }
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
        return xlsxToPdfFallback(bytes);
    }

    // Default fallback attempt
    try {
        return await docxToPdfFallback(bytes);
    } catch {
        return await xlsxToPdfFallback(bytes);
    }
}
