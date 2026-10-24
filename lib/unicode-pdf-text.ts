import "server-only";
// fontkit's Indic (Devanagari, Bengali…) shaper is compiled with regenerator
// and expects this global; without it Hindi text threw
// "regeneratorRuntime is not defined" while being measured.
import "regenerator-runtime/runtime";
import fs from "fs";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

/**
 * Drawing text in any script into a PDF with pdf-lib.
 *
 * pdf-lib lays text out through fontkit, which applies the font's OpenType
 * shaping — so Arabic and Urdu letters join into their proper initial /
 * medial / final forms as long as it is given the text in normal reading
 * order with a font that has those features. The translate tool used to
 * pre-convert the text with arabic-persian-reshaper and reverse it letter by
 * letter instead: Urdu-only letters (ہ ی ٹ ں پ ک ے) were never joined, so
 * words came out as separate letters, and the order was scrambled.
 *
 * fontkit lays an RTL run out right-to-left as a whole, which also reverses
 * any digits or Latin words inside it ("12" became "21"). So a line is cut
 * into direction runs first: right-to-left script (with the spaces and
 * punctuation around it) and left-to-right pieces (Latin, digits), drawn in
 * visual order.
 */

const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Arabic-script or Hebrew text: drawn right to left. */
export function isRtlText(text: string): boolean {
    return RTL_CHAR.test(text);
}

type Script = "rtl" | "indic" | "cjk" | "latin";

function scriptOf(text: string): Script {
    if (RTL_CHAR.test(text)) return "rtl";
    if (/[\u0900-\u0DFF]/.test(text)) return "indic";
    if (/[\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/.test(text)) return "cjk";
    return "latin";
}

/**
 * A TrueType font that has the glyphs and shaping features for the text.
 * Windows fonts locally; Noto / DejaVu on Linux (installed by nixpacks.toml
 * and the Dockerfile). Segoe UI is left out for Arabic script: embedded as a
 * subset it lost most of the letters.
 */
const FONT_CANDIDATES: Record<Script, string[]> = {
    rtl: [
        "C:\\Windows\\Fonts\\tahoma.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ],
    indic: [
        "C:\\Windows\\Fonts\\Nirmala.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ],
    cjk: [
        "C:\\Windows\\Fonts\\malgun.ttf",
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ],
    latin: [
        "C:\\Windows\\Fonts\\arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    ],
};

export function findFontFile(sample: string): string | null {
    const script = scriptOf(sample);
    const list = [...FONT_CANDIDATES[script], ...FONT_CANDIDATES.latin];
    return list.find((p) => fs.existsSync(p)) ?? null;
}

/** Embed the best available font for `sample` (fontkit registered on the document). */
export async function embedFontFor(doc: PDFDocument, sample: string): Promise<PDFFont | null> {
    doc.registerFontkit(fontkit);
    const file = findFontFile(sample);
    if (!file) return null;
    try {
        return await doc.embedFont(fs.readFileSync(file), { subset: true });
    } catch (err) {
        console.warn(`Could not embed ${file}:`, err);
        return null;
    }
}

interface Run {
    text: string;
    rtl: boolean;
}

/**
 * Split a line into direction runs. Left-to-right pieces are the strong LTR
 * characters plus the spaces and number punctuation between them; everything
 * else (the RTL script, spaces and punctuation around it) stays with RTL.
 */
function runsOf(line: string): Run[] {
    if (!isRtlText(line)) return [{ text: line, rtl: false }];
    const runs: Run[] = [];
    const ltr = /[A-Za-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF](?:[A-Za-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF.,:%/'@&+\-_ ]*[A-Za-z0-9\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF%])?/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = ltr.exec(line)) !== null) {
        if (m.index > last) runs.push({ text: line.slice(last, m.index), rtl: true });
        runs.push({ text: m[0], rtl: false });
        last = m.index + m[0].length;
    }
    if (last < line.length) runs.push({ text: line.slice(last), rtl: true });
    return runs.filter((r) => r.text.length > 0);
}

/** Width of a line as drawLine draws it. */
export function lineWidth(font: PDFFont, line: string, size: number): number {
    return runsOf(line).reduce((w, r) => w + font.widthOfTextAtSize(r.text, size), 0);
}

/**
 * Draw one line. `x` is the left edge for LTR text; for RTL text the line is
 * laid out right to left ending at `x + width` of the line, i.e. callers
 * position it by its left edge either way and use lineWidth to right-align.
 */
export function drawLine(
    page: PDFPage,
    font: PDFFont,
    line: string,
    opts: { x: number; y: number; size: number; color?: RGB }
): void {
    const color = opts.color ?? rgb(0, 0, 0);
    const runs = runsOf(line);
    // An RTL line is read right to left, so its runs appear in reverse order
    // from the left edge; each run is then laid out in its own direction.
    const visual = isRtlText(line) ? [...runs].reverse() : runs;
    let x = opts.x;
    for (const run of visual) {
        page.drawText(run.text, { x, y: opts.y, size: opts.size, font, color });
        x += font.widthOfTextAtSize(run.text, opts.size);
    }
}

/** Break a paragraph into lines that fit `maxWidth`, at spaces. */
export function wrapLine(font: PDFFont, text: string, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && lineWidth(font, candidate, size) > maxWidth) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

export interface TextDocument {
    title: string;
    sourceName: string;
    /** Bullet points, or plain text whose line breaks are kept. */
    bullets?: string[];
    text?: string;
}

/**
 * An A4 PDF of a title, source line and body, in any script — the server
 * counterpart to the browser's jsPDF export, whose fonts only cover Latin-1.
 */
export async function textDocumentToPdf(d: TextDocument): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const body = d.bullets ?? (d.text ?? "").split(/\r?\n/);
    const sample = [d.title, ...body].join("\n");
    const font = await embedFontFor(doc, sample);
    if (!font) throw new Error("No font available for this text.");

    const W = 595.28;
    const H = 841.89;
    const margin = 56;
    const width = W - margin * 2;
    let page = doc.addPage([W, H]);
    let y = H - margin;

    const place = (line: string, size: number, color = rgb(0.08, 0.08, 0.08), indent = 0) => {
        if (y - size < margin) {
            page = doc.addPage([W, H]);
            y = H - margin;
        }
        y -= size;
        const w = lineWidth(font, line, size);
        const rtl = isRtlText(line);
        const x = rtl ? margin + width - w - indent : margin + indent;
        drawLine(page, font, line, { x, y, size, color });
        y -= size * 0.45;
    };

    place(d.title, 20);
    y -= 4;
    place(`Source: ${d.sourceName}`, 10, rgb(0.43, 0.43, 0.43));
    place(`Created: ${new Date().toUTCString()}`, 10, rgb(0.43, 0.43, 0.43));
    y -= 14;

    const bullets = Boolean(d.bullets);
    for (const block of body) {
        if (!block.trim()) {
            y -= 12;
            continue;
        }
        const lines = wrapLine(font, block.trim(), 12, width - (bullets ? 16 : 0));
        lines.forEach((line, i) => place(bullets && i === 0 ? `• ${line}` : line, 12, undefined, bullets && i > 0 ? 12 : 0));
        if (bullets) y -= 6;
    }

    return doc.save();
}
