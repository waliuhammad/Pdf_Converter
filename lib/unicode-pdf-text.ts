import "server-only";
// fontkit's Indic (Devanagari, Bengali…) shaper is compiled with regenerator
// and expects this global; without it Hindi text threw
// "regeneratorRuntime is not defined" while being measured.
import "regenerator-runtime/runtime";
import fs from "fs";
import path from "path";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
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
 * into direction runs first, drawn in visual order.
 *
 * Script fonts (Vazirmatn for Arabic script, Noto Sans Devanagari) have no Latin
 * letters, so every run is further cut by font: Latin letters (and anything
 * the script font lacks) are drawn with a Latin font, the rest with the
 * script font.
 *
 * Fonts are bundled in assets/fonts (SIL OFL) so this works the same on any
 * host — Vercel's functions have no system fonts — with system fonts as a
 * fallback. next.config.ts includes the folder in the server bundle.
 */

const RTL_CHAR = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u2022]/;

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

const BUNDLED = (file: string) => path.join(process.cwd(), "assets", "fonts", file);

/**
 * Fonts per script, bundled first. For Arabic script the font must carry its
 * dots inside each letter: pdf-lib does not apply GPOS mark positioning, so
 * fonts that place dots as separate marks (Noto Naskh Arabic) drew them
 * beside the letters. Vazirmatn (SIL OFL) covers Urdu and works; Segoe UI is
 * left out because embedded as a subset it lost most of the letters.
 */
const FONT_CANDIDATES: Record<Script, string[]> = {
    rtl: [
        BUNDLED("Vazirmatn-Regular.ttf"),
        "C:\\Windows\\Fonts\\tahoma.ttf",
    ],
    indic: [
        BUNDLED("NotoSansDevanagari-Regular.ttf"),
        "/usr/share/fonts/truetype/noto/NotoSansDevanagari-Regular.ttf",
        "C:\\Windows\\Fonts\\Nirmala.ttf",
    ],
    cjk: [
        "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
        "C:\\Windows\\Fonts\\malgun.ttf",
    ],
    latin: [
        BUNDLED("NotoSans-Regular.ttf"),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
    ],
};

function firstExisting(list: string[]): string | null {
    return list.find((p) => fs.existsSync(p)) ?? null;
}

/** The font for the script of the text, and a Latin font for what it lacks. */
export interface FontSet {
    main: PDFFont;
    latin: PDFFont;
    /** Whether the main font has a glyph for this code point. */
    mainHas: (codePoint: number) => boolean;
}

/**
 * Embed fonts for `sample` (registers fontkit on the document). Falls back to
 * Helvetica — Latin only — when no font file can be found at all.
 */
export async function embedFontsFor(doc: PDFDocument, sample: string): Promise<FontSet> {
    doc.registerFontkit(fontkit);

    const load = async (file: string | null) => {
        if (!file) return null;
        try {
            const bytes = fs.readFileSync(file);
            const pdfFont = await doc.embedFont(bytes, { subset: true });
            const fk = fontkit.create(bytes) as unknown as { hasGlyphForCodePoint?: (cp: number) => boolean };
            return { pdfFont, has: (cp: number) => fk.hasGlyphForCodePoint?.(cp) ?? true };
        } catch (err) {
            console.warn(`Could not embed ${file}:`, err);
            return null;
        }
    };

    const latin = (await load(firstExisting(FONT_CANDIDATES.latin)))?.pdfFont ?? (await doc.embedStandardFont(StandardFonts.Helvetica));
    const script = scriptOf(sample);
    const main = script === "latin" ? null : await load(firstExisting(FONT_CANDIDATES[script]));

    return main
        ? { main: main.pdfFont, latin, mainHas: main.has }
        : { main: latin, latin, mainHas: () => true };
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

/** Cut a run into pieces that each use one font. */
function piecesOf(fonts: FontSet, text: string): { text: string; font: PDFFont }[] {
    const pieces: { text: string; font: PDFFont }[] = [];
    for (const ch of text) {
        const cp = ch.codePointAt(0) ?? 32;
        const font = fonts.main === fonts.latin || LATIN_LETTER.test(ch) || !fonts.mainHas(cp) ? fonts.latin : fonts.main;
        const last = pieces[pieces.length - 1];
        if (last && last.font === font) last.text += ch;
        else pieces.push({ text: ch, font });
    }
    return pieces;
}

/** Each piece in left-to-right drawing order. */
function visualPieces(fonts: FontSet, line: string) {
    const runs = runsOf(line);
    // An RTL line is read right to left, so its runs appear in reverse order
    // from the left edge; within an RTL run the font pieces reverse too, and
    // fontkit lays each piece out in its own direction.
    const ordered = isRtlText(line) ? [...runs].reverse() : runs;
    return ordered.flatMap((run) => {
        const pieces = piecesOf(fonts, run.text);
        return run.rtl ? pieces.reverse() : pieces;
    });
}

/** Width of a line as drawLine draws it. */
export function lineWidth(fonts: FontSet, line: string, size: number): number {
    return visualPieces(fonts, line).reduce((w, p) => w + p.font.widthOfTextAtSize(p.text, size), 0);
}

/** Draw one line with its left edge at `x` (right-align RTL text with lineWidth). */
export function drawLine(
    page: PDFPage,
    fonts: FontSet,
    line: string,
    opts: { x: number; y: number; size: number; color?: RGB }
): void {
    const color = opts.color ?? rgb(0, 0, 0);
    let x = opts.x;
    for (const piece of visualPieces(fonts, line)) {
        page.drawText(piece.text, { x, y: opts.y, size: opts.size, font: piece.font, color });
        x += piece.font.widthOfTextAtSize(piece.text, opts.size);
    }
}

/** Break a paragraph into lines that fit `maxWidth`, at spaces. */
export function wrapLine(fonts: FontSet, text: string, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && lineWidth(fonts, candidate, size) > maxWidth) {
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
    const fonts = await embedFontsFor(doc, [d.title, ...body].join("\n"));

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
        const w = lineWidth(fonts, line, size);
        const x = isRtlText(line) ? margin + width - w - indent : margin + indent;
        drawLine(page, fonts, line, { x, y, size, color });
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
        const lines = wrapLine(fonts, block.trim(), 12, width - (bullets ? 16 : 0));
        lines.forEach((line, i) => place(bullets && i === 0 ? `• ${line}` : line, 12, undefined, bullets && i > 0 ? 12 : 0));
        if (bullets) y -= 6;
    }

    return doc.save();
}
