import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb, PDFFont } from "pdf-lib";

/**
 * Turn a .docx into a PDF here, rather than posting the document to ConvertAPI.
 *
 * The route used to need CONVERTAPI_SECRET and answered 503 without it, so the
 * tool was dead. A .docx is a zip of XML and a PDF is something pdf-lib can
 * write, so nothing has to leave the server.
 *
 * This reads the document's text, its paragraph structure, headings and
 * bold/italic runs. It does not reproduce tables, images, columns or precise
 * Word layout — callers should say so rather than imply a pixel-faithful
 * conversion.
 */

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = 56;
const BODY_SIZE = 11;
const LINE_GAP = 1.45;
const PARA_GAP = 8;

/** Heading level -> point size. Anything deeper reads as body text. */
const HEADING_SIZES: Record<string, number> = {
    Heading1: 20,
    Heading2: 16,
    Heading3: 13,
    Title: 24,
};

interface Run {
    text: string;
    bold: boolean;
    italic: boolean;
}

interface Paragraph {
    runs: Run[];
    size: number;
    /** Headings are bold regardless of the run's own formatting. */
    heading: boolean;
}

const asArray = <T,>(v: T | T[] | undefined): T[] =>
    v === undefined ? [] : Array.isArray(v) ? v : [v];

/**
 * A node of parsed OOXML.
 *
 * fast-xml-parser returns whatever the document contains: an object for an
 * element with children, a string for a bare text node, an array when a tag
 * repeats. Indexing is what the walk below does throughout, so an index
 * signature says more than `any` does and still keeps the reads checked.
 */
type XmlValue = string | XmlNode | XmlNode[] | undefined;
interface XmlNode {
    [key: string]: XmlValue;
}

/** One step down the tree, or undefined if this is not an element. */
const child = (node: XmlValue, key: string): XmlValue =>
    node && typeof node === "object" && !Array.isArray(node) ? node[key] : undefined;

/** True when the element carries a given child tag — how <w:b/> signals bold. */
const has = (node: XmlValue, key: string): boolean =>
    !!node && typeof node === "object" && !Array.isArray(node) && key in node;

/**
 * The standard fonts are WinAnsi, which throws on anything outside it — smart
 * quotes survive, CJK and emoji do not. Replacing beats failing the whole file.
 */
function toWinAnsi(text: string): string {
    return text
        .replace(/[‘’‚‛]/g, "'")
        .replace(/[“”„‟]/g, '"')
        .replace(/[–—]/g, "-")
        .replace(/…/g, "...")
        .replace(/ /g, " ")
        .replace(/[^\x09\x0A\x0D\x20-\xFF]/g, "?");
}

/** Split a run of text to fit `maxWidth`, breaking mid-word only when a single word is too long. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = "";

    for (const word of text.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;

        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
            line = candidate;
            continue;
        }

        if (line) lines.push(line);

        // A single word wider than the column has to be cut somewhere.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
            let cut = rest.length;
            while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
            lines.push(rest.slice(0, cut));
            rest = rest.slice(cut);
        }
        line = rest;
    }

    if (line) lines.push(line);
    return lines.length ? lines : [""];
}

function parseParagraphs(documentXml: string, XMLParser: typeof import("fast-xml-parser").XMLParser): Paragraph[] {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@",
        preserveOrder: false,
        trimValues: false,
    });

    const doc = parser.parse(documentXml);
    const body = doc?.["w:document"]?.["w:body"];
    if (!body) return [];

    return asArray<XmlNode>(body["w:p"]).map((p): Paragraph => {
        const styleId = child(child(child(p, "w:pPr"), "w:pStyle"), "@w:val");
        const headingSize = typeof styleId === "string" ? HEADING_SIZES[styleId] : undefined;

        const runs: Run[] = [];
        for (const r of asArray<XmlNode>(child(p, "w:r") as XmlNode | XmlNode[] | undefined)) {
            const props = child(r, "w:rPr");
            // <w:b/> parses to an empty object or "", both meaning "on".
            const bold = has(props, "w:b");
            const italic = has(props, "w:i");

            for (const t of asArray<XmlValue>(child(r, "w:t"))) {
                const text = typeof t === "string" ? t : (child(t, "#text") ?? "");
                if (text !== "") runs.push({ text: String(text), bold, italic });
            }

            // <w:br/> and <w:tab/> carry no text but do affect reading.
            if (has(r, "w:tab")) runs.push({ text: "    ", bold, italic });
        }

        return {
            runs,
            size: headingSize ?? BODY_SIZE,
            heading: headingSize !== undefined,
        };
    });
}

export async function docxToPdf(bytes: Uint8Array): Promise<Uint8Array> {
    const { XMLParser } = await import("fast-xml-parser");

    let zip: JSZip;
    try {
        zip = await JSZip.loadAsync(bytes);
    } catch {
        throw new Error("That file could not be read as a Word document.");
    }

    const entry = zip.file("word/document.xml");
    if (!entry) {
        throw new Error("That file is not a Word document — word/document.xml is missing.");
    }

    const paragraphs = parseParagraphs(await entry.async("string"), XMLParser);

    const pdf = await PDFDocument.create();
    const fonts = {
        regular: await pdf.embedFont(StandardFonts.Helvetica),
        bold: await pdf.embedFont(StandardFonts.HelveticaBold),
        italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
        boldItalic: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
    };
    const pick = (bold: boolean, italic: boolean) =>
        bold && italic ? fonts.boldItalic : bold ? fonts.bold : italic ? fonts.italic : fonts.regular;

    const columnWidth = PAGE.width - MARGIN * 2;
    let page = pdf.addPage([PAGE.width, PAGE.height]);
    let y = PAGE.height - MARGIN;

    const newPage = () => {
        page = pdf.addPage([PAGE.width, PAGE.height]);
        y = PAGE.height - MARGIN;
    };

    for (const para of paragraphs) {
        const lineHeight = para.size * LINE_GAP;

        // An empty paragraph is deliberate spacing in Word.
        if (para.runs.length === 0) {
            y -= lineHeight;
            if (y < MARGIN) newPage();
            continue;
        }

        // Formatting is tracked per run, but wrapping needs the whole paragraph,
        // so lay it out run by run and carry the x position along each line.
        let x = MARGIN;
        if (y - lineHeight < MARGIN) newPage();

        for (const run of para.runs) {
            const font = pick(run.bold || para.heading, run.italic);
            const text = toWinAnsi(run.text);
            const remaining = columnWidth - (x - MARGIN);
            const [first, ...rest] = wrap(text, font, para.size, remaining > 40 ? remaining : columnWidth);

            const draw = (segment: string) => {
                page.drawText(segment, { x, y, size: para.size, font, color: rgb(0.09, 0.08, 0.12) });
                x += font.widthOfTextAtSize(segment, para.size);
            };

            if (remaining <= 40 && x > MARGIN) {
                y -= lineHeight;
                x = MARGIN;
                if (y < MARGIN) newPage();
            }

            draw(first);

            for (const line of rest) {
                y -= lineHeight;
                x = MARGIN;
                if (y < MARGIN) newPage();
                draw(line);
            }
        }

        y -= lineHeight + (para.heading ? PARA_GAP * 1.5 : PARA_GAP);
        if (y < MARGIN) newPage();
    }

    return pdf.save();
}
