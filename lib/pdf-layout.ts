import "server-only";
import {
    PDFArray,
    PDFDict,
    PDFDocument,
    PDFName,
    PDFRawStream,
    PDFRef,
    decodePDFRawStream,
    type PDFContext,
    type PDFObject,
} from "pdf-lib";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";

/**
 * The two halves of an editable conversion: the page's artwork without its
 * text, and the text itself with where and how it was drawn.
 *
 * PDF -> Word / PowerPoint places the artwork as a background image and puts
 * each line of text on top as a real, editable text box with the same font,
 * size, weight and colour. The page looks the same, and the words can be
 * changed.
 */

// ---------------------------------------------------------------- artwork without text

/**
 * Every piece of text in a PDF is drawn between BT and ET operators, so
 * removing those blocks from the page's drawing instructions leaves the
 * borders, shapes, images and colours exactly where they were, minus the
 * words. Strings, dictionaries and inline image data are skipped over as
 * whole tokens so a "BT" inside them is never mistaken for an operator.
 */
function removeTextObjects(content: Uint8Array): Uint8Array {
    // latin1 maps every byte to one char and back, so binary survives.
    const src = Buffer.from(content).toString("latin1");
    const n = src.length;
    const isSpace = (c: string) => c === " " || c === "\n" || c === "\r" || c === "\t" || c === "\f" || c === "\0";
    const isDelim = (c: string) => "()<>[]{}/%".includes(c);

    let out = "";
    let copiedUpTo = 0;
    let textStart = -1;
    let i = 0;

    while (i < n) {
        const c = src[i];
        if (isSpace(c)) {
            i++;
        } else if (c === "%") {
            while (i < n && src[i] !== "\n" && src[i] !== "\r") i++;
        } else if (c === "(") {
            let depth = 0;
            for (; i < n; i++) {
                if (src[i] === "\\") i++;
                else if (src[i] === "(") depth++;
                else if (src[i] === ")" && --depth === 0) {
                    i++;
                    break;
                }
            }
        } else if (c === "<" && src[i + 1] !== "<") {
            const end = src.indexOf(">", i);
            i = end === -1 ? n : end + 1;
        } else if (isDelim(c)) {
            i += (c === "<" || c === ">") && src[i + 1] === c ? 2 : 1;
            if (c === "/") while (i < n && !isSpace(src[i]) && !isDelim(src[i])) i++;
        } else {
            const start = i;
            while (i < n && !isSpace(src[i]) && !isDelim(src[i])) i++;
            const token = src.slice(start, i);

            if (token === "BI") {
                // Inline image: its data after ID is raw bytes up to EI.
                const id = src.indexOf("ID", i);
                const ei = id === -1 ? -1 : src.slice(id + 3).search(/\sEI(\s|$)/);
                i = ei === -1 ? n : id + 3 + ei + 3;
            } else if (token === "BT" && textStart === -1) {
                textStart = start;
            } else if (token === "ET" && textStart !== -1) {
                out += src.slice(copiedUpTo, textStart);
                copiedUpTo = i;
                textStart = -1;
            }
        }
    }
    out += src.slice(copiedUpTo);
    return new Uint8Array(Buffer.from(out, "latin1"));
}

function decoded(stream: PDFRawStream): Uint8Array {
    return decodePDFRawStream(stream).decode();
}

/** Replace a stream's data with uncompressed bytes, keeping its other entries. */
function rewriteStream(context: PDFContext, ref: PDFRef, stream: PDFRawStream, data: Uint8Array) {
    const dict = stream.dict.clone(context);
    dict.delete(PDFName.of("Filter"));
    dict.delete(PDFName.of("DecodeParms"));
    context.assign(ref, PDFRawStream.of(dict, data));
}

/** Text inside form XObjects (reused page parts) is stripped too, once per form. */
function stripForms(context: PDFContext, resources: PDFObject | undefined, seen: Set<string>) {
    const res = resources ? context.lookup(resources) : undefined;
    if (!(res instanceof PDFDict)) return;
    const xobjects = context.lookup(res.get(PDFName.of("XObject")));
    if (!(xobjects instanceof PDFDict)) return;

    for (const value of xobjects.values()) {
        if (!(value instanceof PDFRef) || seen.has(value.toString())) continue;
        seen.add(value.toString());
        const form = context.lookup(value);
        if (!(form instanceof PDFRawStream)) continue;
        if (form.dict.get(PDFName.of("Subtype")) !== PDFName.of("Form")) continue;

        rewriteStream(context, value, form, removeTextObjects(decoded(form)));
        stripForms(context, form.dict.get(PDFName.of("Resources")), seen);
    }
}

/** The same PDF with all text removed: the page artwork only. */
export async function stripPdfText(bytes: Uint8Array): Promise<Uint8Array> {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const context = doc.context;
    const seen = new Set<string>();

    for (const page of doc.getPages()) {
        const contents = page.node.get(PDFName.of("Contents"));
        const parts: Uint8Array[] = [];
        const refs =
            contents instanceof PDFRef
                ? context.lookup(contents) instanceof PDFArray
                    ? (context.lookup(contents) as PDFArray).asArray()
                    : [contents]
                : contents instanceof PDFArray
                  ? contents.asArray()
                  : [];

        for (const ref of refs) {
            const stream = context.lookup(ref);
            if (stream instanceof PDFRawStream) parts.push(decoded(stream));
        }
        if (parts.length > 0) {
            // A page's content may be split across streams mid-operator, so
            // they are joined before stripping and written back as one.
            const joined = Buffer.concat(parts.map((p) => Buffer.concat([Buffer.from(p), Buffer.from("\n")])));
            const stripped = removeTextObjects(new Uint8Array(joined));
            const ref = context.register(PDFRawStream.of(context.obj({}), stripped));
            page.node.set(PDFName.of("Contents"), ref);
        }

        stripForms(context, page.node.Resources(), seen);
    }

    return doc.save({ useObjectStreams: false });
}

// ---------------------------------------------------------------- the text

export interface TextLine {
    text: string;
    /** Left edge and top edge of the line, in points from the page's top-left. */
    x: number;
    top: number;
    /** Measured width of the line in points. */
    width: number;
    /** Font size in points. */
    size: number;
    /** A font name Word and PowerPoint will recognise, e.g. "Times New Roman". */
    font: string;
    bold: boolean;
    italic: boolean;
    /** "RRGGBB". */
    color: string;
    /**
     * Extra space, in points, after each letter and after each space, so the
     * line comes out as wide as in the PDF: letter-spaced headings, justified
     * paragraphs, table cells padded with spacing. Absent when the PDF draws
     * the text at its natural width.
     */
    spacing?: { letters: number; spaces: number };
}

export interface PageText {
    widthPt: number;
    heightPt: number;
    lines: TextLine[];
}

/** PDF base fonts and embedded subsets -> the name an Office app has installed. */
function officeFont(name: string, family: string | undefined): string {
    const base = name.replace(/^[A-Z]{6}\+/, "").split(/[-,]/)[0];
    if (/times/i.test(base)) return "Times New Roman";
    if (/helvetica|arial/i.test(base)) return "Arial";
    if (/courier/i.test(base)) return "Courier New";
    if (/symbol/i.test(base)) return "Symbol";
    if (base && !/^g_d\d/.test(base)) {
        // "ArialMT", "Calibri-Bold", "OpenSans" -> "Arial", "Calibri", "Open Sans".
        return base.replace(/MT$|PS$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    }
    return family === "serif" ? "Times New Roman" : family === "monospace" ? "Courier New" : "Arial";
}

function hex(rgb: ArrayLike<number> | string | undefined): string {
    if (typeof rgb === "string") return rgb.replace("#", "").toUpperCase().padStart(6, "0");
    if (!rgb || !(rgb.length >= 3)) return "000000";
    const channels = [rgb[0], rgb[1], rgb[2]];
    if (channels.some((v) => typeof v !== "number" || !Number.isFinite(v))) return "000000";
    return channels
        .map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
}

interface Run {
    text: string;
    x: number;
    baseline: number;
    width: number;
    size: number;
    font: string;
    bold: boolean;
    italic: boolean;
    color: string;
    /** Width of the text at the font's own advances, with no added spacing (page points). */
    natural?: number;
    /** Space the PDF adds after each letter, in page points. */
    letterSpacing?: number;
    /** Natural width of a space in this font and size, in page points. */
    spaceWidth?: number;
    /** The PDF draws a space glyph right after this string: the next one is the same sentence. */
    spaceAfter?: boolean;
}

const squash = (s: string) => s.replace(/\s+/g, "");

/** One drawn glyph, from the operator list. */
interface DrawnGlyph {
    unicode: string;
    isSpace: boolean;
    /** The glyph's own advance, in ems. */
    em: number;
    /** Letter spacing in force (Tc), in ems. */
    tcEm: number;
    color: string;
}

/**
 * Every glyph the page draws, in order, with its own width and colour.
 *
 * pdf.js's text content says where a string starts and how wide it is, but
 * not how much of that width is the letters and how much is spacing the PDF
 * added between them — by letter spacing, by TJ shifts, or (as Chrome does)
 * by moving to each glyph separately. The letters' own widths are what Word
 * will draw, so the difference is the spacing Word has to add to land the
 * line at the same width.
 */
function drawnGlyphs(ops: { fnArray: number[]; argsArray: unknown[][] }, OPS: Record<string, number>): DrawnGlyph[] {
    const out: DrawnGlyph[] = [];
    let fill = "000000";
    let fontSize = 12;
    let tc = 0;
    const stack: { fill: string; tc: number; fontSize: number }[] = [];

    const show = (items: unknown[]) => {
        for (const g of items) {
            if (!g || typeof g !== "object") continue;
            const glyph = g as { unicode?: string; width?: number; isSpace?: boolean };
            out.push({
                unicode: glyph.unicode ?? "",
                isSpace: Boolean(glyph.isSpace) || glyph.unicode === " ",
                em: (glyph.width ?? 0) / 1000,
                tcEm: tc / fontSize,
                color: fill,
            });
        }
    };

    for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i] ?? [];
        // pdf.js passes the colour as three 0-255 values (or, in some builds,
        // one "#rrggbb" string).
        if (fn === OPS.setFillRGBColor) fill = hex(typeof args[0] === "string" ? args[0] : (args as number[]));
        else if (fn === OPS.setFont) fontSize = Math.abs(Number(args[1])) || fontSize;
        else if (fn === OPS.setCharSpacing) tc = Number(args[0]) || 0;
        else if (fn === OPS.save) stack.push({ fill, tc, fontSize });
        else if (fn === OPS.restore) ({ fill, tc, fontSize } = stack.pop() ?? { fill, tc, fontSize });
        else if (fn === OPS.showText || fn === OPS.showSpacedText || fn === OPS.nextLineShowText) show(args[0] as unknown[]);
        else if (fn === OPS.nextLineSetSpacingShowText) {
            tc = Number(args[1]) || 0;
            show(args[2] as unknown[]);
        }
    }
    return out;
}

/**
 * Text with position, font, colour and spacing for every page.
 *
 * Position, size and font come from pdf.js's text content. Each string is then
 * matched to the glyphs the page draws (drawnGlyphs), which give its colour,
 * its true text and how much spacing the PDF put between its letters.
 */
export async function readTextLayout(bytes: Uint8Array): Promise<PageText[]> {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.js");
    const doc = await withOwnPdfWorker(() =>
        pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, useSystemFonts: true }).promise
    );
    const OPS = pdfjs.OPS;
    const pages: PageText[] = [];

    try {
        for (let p = 1; p <= doc.numPages; p++) {
            const page = await doc.getPage(p);
            const viewport = page.getViewport({ scale: 1 });

            const ops = await page.getOperatorList();
            const glyphs = drawnGlyphs(ops, OPS as unknown as Record<string, number>);
            // The drawn text with spaces removed, and for each of its
            // characters the glyph it came from, so a string from the text
            // content can be found in it.
            let stream = "";
            const owner: number[] = [];
            glyphs.forEach((g, k) => {
                for (const ch of squash(g.unicode)) {
                    stream += ch;
                    owner.push(k);
                }
            });

            const content = await page.getTextContent();
            const runs: Run[] = [];
            let cursor = 0;

            for (const item of content.items) {
                if (!("str" in item) || item.str === "") continue;

                const target = squash(item.str);
                let color = runs.length > 0 ? runs[runs.length - 1].color : "000000";
                let text = item.str;
                let natural: number | undefined;
                let letterSpacing: number | undefined;
                let spaceWidth: number | undefined;
                let spaceAfter = false;
                const size = Math.hypot((item.transform as number[])[0], (item.transform as number[])[1]) || 12;

                // Strings come in drawing order, so look just ahead of the last
                // match; a string not found nearby (ligatures, unusual
                // encodings) keeps pdf.js's text and gets no spacing.
                const at = target ? stream.indexOf(target, cursor) : -1;
                if (at !== -1 && at - cursor < 4000) {
                    cursor = at + target.length;
                    const first = owner[at];
                    const last = owner[at + target.length - 1];
                    const span = glyphs.slice(first, last + 1);
                    color = span[0].color;
                    spaceAfter = Boolean(glyphs[last + 1]?.isSpace);

                    natural = span.reduce((sum, g) => sum + g.em, 0) * size;
                    const space = [...span, glyphs[last + 1]].find((g) => g?.isSpace && g.em > 0);
                    if (space) spaceWidth = space.em * size;
                    const letters = span.filter((g) => !g.isSpace).length;
                    if (span[0].tcEm) letterSpacing = span[0].tcEm * size;
                    else if (letters > 1 && letters === span.length) letterSpacing = (item.width - natural) / (letters - 1);

                    // pdf.js puts a space wherever glyphs sit apart, so a
                    // heading spread with letter spacing came out as
                    // "C E R T I F I C A T E". When the spaces it added sit
                    // between most letters they are letter spacing, and the
                    // string is rebuilt from the glyphs; a few added spaces
                    // are word gaps the PDF drew without a space glyph, and
                    // stay.
                    const drawnText = span.map((g) => g.unicode).join("");
                    const added = item.str.length - drawnText.length;
                    if (letters >= 2 && added >= (letters - 1) * 0.7) text = drawnText;
                }

                const [, , , , e, f] = item.transform as number[];
                const font = page.commonObjs.has(item.fontName)
                    ? (page.commonObjs.get(item.fontName) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean })
                    : null;
                const realName = font?.name ?? "";

                runs.push({
                    text,
                    natural,
                    letterSpacing,
                    spaceWidth,
                    spaceAfter,
                    x: e,
                    baseline: f,
                    width: item.width,
                    size,
                    font: officeFont(realName, content.styles[item.fontName]?.fontFamily),
                    bold: Boolean(font?.bold || font?.black) || /bold|black|heavy|semibold/i.test(realName),
                    italic: Boolean(font?.italic) || /italic|oblique/i.test(realName),
                    color,
                });
            }

            pages.push({
                widthPt: viewport.width,
                heightPt: viewport.height,
                lines: groupIntoLines(runs, viewport.height),
            });
            page.cleanup();
        }
    } finally {
        await doc.destroy();
    }
    return pages;
}

/**
 * How far below the top of its line Office draws a font's baseline, in ems
 * (the font's Windows ascent). A fixed 0.8 put Calibri text about 0.15 em too
 * low, which on a statement is visibly off the table rules.
 */
function ascentOf(font: string): number {
    if (/calibri|cambria|candara|consolas|constantia|corbel/i.test(font)) return 0.952;
    if (/verdana|tahoma|segoe/i.test(font)) return 1.0;
    if (/arial|helvetica/i.test(font)) return 0.905;
    if (/georgia/i.test(font)) return 0.917;
    if (/times/i.test(font)) return 0.891;
    if (/courier/i.test(font)) return 0.833;
    return 0.9;
}

/**
 * Runs on the same baseline, in the same style, with no more than a word space
 * between them become one line, so editing a sentence means editing one box
 * rather than a box per word. Anything wider — table columns, right-aligned
 * amounts, a label and its value — stays a separate box at its own position.
 *
 * pdf.js reports the gap between two strings as a whitespace item as wide as
 * the gap. Counting those as text glued every column of a bank statement into
 * one line ("01/10/2026 POS PURCHASE … REF100230"), and the joined line then
 * ran on at Word's own spacing instead of landing in the next column. So
 * whitespace items are not text here: only real glyphs decide where a line
 * ends, and a gap becomes a single space when it is a word space.
 */
function groupIntoLines(runs: Run[], pageHeight: number): TextLine[] {
    const sorted = [...runs]
        .filter((r) => r.text.trim() !== "")
        .sort((r, s) => Math.round(s.baseline) - Math.round(r.baseline) || r.x - s.x);
    // letterSum / letterCount: the runs' letter spacing, averaged over their letters.
    type Line = Run & { end: number; addedSpaces: number; measured: boolean; letterSum: number; letterCount: number };
    const lines: Line[] = [];

    for (const run of sorted) {
        const last = lines[lines.length - 1];
        const gap = last ? run.x - last.end : 0;
        // Letter-spaced text has its word gaps widened by the same spacing.
        // A justified line stretches its word gaps well past that, but then
        // the PDF draws a space glyph after the word, which table cells and
        // separate labels do not have.
        const wordGap =
            (last?.spaceAfter ? run.size * 3 : run.size * 0.6) + 2 * Math.max(0, run.letterSpacing ?? 0);
        const sameLine =
            last &&
            Math.abs(last.baseline - run.baseline) < run.size * 0.4 &&
            last.font === run.font &&
            last.bold === run.bold &&
            last.italic === run.italic &&
            last.color === run.color &&
            Math.abs(last.size - run.size) < 1.0 &&
            gap < wordGap &&
            gap > -run.size * 0.3;

        if (sameLine) {
            // About a fifth of an em is a word space; less is letter spacing
            // or kerning inside a word drawn in pieces.
            const needsSpace =
                gap > run.size * 0.18 + Math.max(0, run.letterSpacing ?? 0) && !/\s$/.test(last.text) && !/^\s/.test(run.text);
            last.text += (needsSpace ? " " : "") + run.text;
            if (needsSpace) last.addedSpaces++;
            last.measured = last.measured && run.natural !== undefined;
            last.natural = (last.natural ?? 0) + (run.natural ?? 0);
            last.spaceWidth ??= run.spaceWidth;
            last.spaceAfter = run.spaceAfter;
            if (run.letterSpacing !== undefined) {
                last.letterSum += run.letterSpacing * run.text.length;
                last.letterCount += run.text.length;
            }
            last.end = Math.max(last.end, run.x + run.width);
            last.width = last.end - last.x;
        } else {
            lines.push({
                ...run,
                end: run.x + run.width,
                addedSpaces: 0,
                measured: run.natural !== undefined,
                letterSum: (run.letterSpacing ?? 0) * run.text.length,
                letterCount: run.letterSpacing !== undefined ? run.text.length : 0,
            });
        }
    }

    return lines.map((l) => {
        const text = l.text.replace(/\s+$/, "");
        return {
            text,
            x: l.x,
            // Word and PowerPoint put the baseline one font ascent below the top
            // of a zero-margin text box, so the box starts that far above it.
            top: pageHeight - l.baseline - l.size * ascentOf(l.font),
            width: l.width,
            size: l.size,
            font: l.font,
            bold: l.bold,
            italic: l.italic,
            color: l.color,
            spacing: l.measured
                ? lineSpacing({ ...l, letterSpacing: l.letterCount ? l.letterSum / l.letterCount : 0 }, text)
                : undefined,
        };
    });
}

/**
 * The character spacing that makes Word draw a line as wide as the PDF does.
 *
 * Word spreads the extra after every character of a run. Letter spacing (the
 * PDF's Tc) goes after every character; whatever width is left over — a
 * justified line's stretched word gaps, a column padded with word spacing —
 * goes after the spaces, which is where the PDF put it. With no spaces it is
 * spread over the letters. This only holds when Word has the same font as the
 * PDF; with a substitute the widths differ anyway, and nothing is added when
 * the result looks implausible.
 */
function lineSpacing(
    l: { natural?: number; letterSpacing?: number; spaceWidth?: number; addedSpaces: number; width: number; size: number },
    text: string
): TextLine["spacing"] {
    const spaces = (text.match(/ /g) ?? []).length;
    const letters = [...text].length - spaces;
    if (letters === 0 || l.natural === undefined) return undefined;

    // Spaces added between strings were not part of any string's own width.
    const natural = l.natural + l.addedSpaces * (l.spaceWidth ?? l.size * 0.25);
    let perLetter = l.letterSpacing ?? 0;
    let perSpace = 0;
    const rest = l.width - natural - (letters + spaces) * perLetter;
    if (spaces > 0) perSpace = rest / spaces;
    else perLetter += rest / letters;

    if (Math.abs(perLetter) < 0.05 && Math.abs(perSpace) < 0.15) return undefined;
    if (perLetter > l.size || perLetter < -l.size * 0.2 || perSpace > l.size * 3 || perSpace < -l.size * 0.25) return undefined;
    return { letters: perLetter, spaces: perSpace };
}
