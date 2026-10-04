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
}

/**
 * Text with position, font and colour for every page.
 *
 * Position, size and font come from pdf.js's text content. Colour is not part
 * of that, so it is read from the drawing instructions: the fill colour in
 * force at each text-showing operator, matched to the text runs in order.
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

            // Colour per text-showing operator, in drawing order.
            const ops = await page.getOperatorList();
            let fill = "000000";
            const drawn: { text: string; color: string }[] = [];
            for (let i = 0; i < ops.fnArray.length; i++) {
                const fn = ops.fnArray[i];
                const args = ops.argsArray[i];
                // pdf.js passes the colour as three 0-255 values (or, in some
                // builds, one "#rrggbb" string).
                if (fn === OPS.setFillRGBColor) fill = hex(typeof args[0] === "string" ? args[0] : args);
                else if (fn === OPS.showText || fn === OPS.showSpacedText) {
                    const glyphs = (args[0] as unknown[]).filter((g) => g && typeof g === "object") as { unicode?: string }[];
                    drawn.push({ text: glyphs.map((g) => g.unicode ?? "").join(""), color: fill });
                }
            }

            const content = await page.getTextContent();
            const runs: Run[] = [];
            let cursor = 0;
            const squash = (s: string) => s.replace(/\s+/g, "");

            for (const item of content.items) {
                if (!("str" in item) || !item.str.trim()) continue;

                // Find the drawing op this run came from to learn its colour.
                const target = squash(item.str);
                let color = "000000";
                for (let k = cursor; k < drawn.length; k++) {
                    const op = squash(drawn[k].text);
                    if (op && (op.includes(target) || target.includes(op))) {
                        color = drawn[k].color;
                        cursor = k;
                        break;
                    }
                }

                const [a, b, , d, e, f] = item.transform as number[];
                const size = Math.hypot(a, b) || Math.abs(d) || 12;
                const font = page.commonObjs.has(item.fontName)
                    ? (page.commonObjs.get(item.fontName) as { name?: string; bold?: boolean; black?: boolean; italic?: boolean })
                    : null;
                const realName = font?.name ?? "";

                runs.push({
                    text: item.str,
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
 * Runs on the same baseline, in the same style, with no big gap between them
 * become one line, so editing a sentence means editing one box rather than a
 * box per word. A large gap (columns, a table) keeps them separate so they
 * stay in their own positions.
 */
function groupIntoLines(runs: Run[], pageHeight: number): TextLine[] {
    const sorted = [...runs].sort((r, s) => s.baseline - r.baseline || r.x - s.x);
    const lines: (Run & { end: number })[] = [];

    for (const run of sorted) {
        const last = lines[lines.length - 1];
        const sameLine =
            last &&
            Math.abs(last.baseline - run.baseline) < run.size * 0.3 &&
            last.font === run.font &&
            last.bold === run.bold &&
            last.italic === run.italic &&
            last.color === run.color &&
            Math.abs(last.size - run.size) < 0.5 &&
            run.x - last.end < run.size * 1.2 &&
            run.x >= last.x;

        if (sameLine) {
            const gap = run.x - last.end;
            const needsSpace = gap > run.size * 0.15 && !/\s$/.test(last.text) && !/^\s/.test(run.text);
            last.text += (needsSpace ? " " : "") + run.text;
            last.end = Math.max(last.end, run.x + run.width);
            last.width = last.end - last.x;
        } else {
            lines.push({ ...run, end: run.x + run.width });
        }
    }

    return lines.map((l) => ({
        text: l.text.replace(/\s+$/, ""),
        x: l.x,
        // The baseline sits about 0.8 em below the top of the line box.
        top: pageHeight - l.baseline - l.size * 0.8,
        width: l.width,
        size: l.size,
        font: l.font,
        bold: l.bold,
        italic: l.italic,
        color: l.color,
    }));
}
