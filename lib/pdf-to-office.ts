import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import { pdfToPng } from "pdf-to-png-converter";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";
import type { TextLine } from "@/lib/pdf-layout";
import type { TextCell } from "@/lib/pdf-text";
import type { HLine, VLine } from "@/lib/pdf-graphics";

/**
 * PDF -> Word / PowerPoint / Excel that look exactly like the PDF.
 *
 * These tools used to pull the text out of the PDF and lay it down again as
 * plain paragraphs, slides of bullet points or rows of cells. A certificate,
 * a brochure or a designed report came back as a page of loose text: the
 * borders, logos, fonts, colours and layout were all gone.
 *
 * Now every page's artwork is rendered to an image at print-friendly
 * resolution and placed full-size in the output — one page per Word section,
 * one slide per page, one worksheet per page. For Word and PowerPoint the
 * artwork is rendered without its text, and each line of text is laid on top
 * as a real text box in the same place, font, size, weight and colour (see
 * lib/pdf-layout.ts), so the document looks the same and can still be edited.
 * Excel has an editable, position-based grid for each page and a separate
 * exact-layout preview sheet.
 */

/** 2.5 x 72 dpi = 180 dpi: sharp on screen and acceptable in print. */
export const SCALE = 2.5;

export interface RenderedPage {
    png: Buffer;
    /** Page size in PDF points (1/72 inch). */
    widthPt: number;
    heightPt: number;
    /** Editable text to lay over the image; absent when the image already shows the text. */
    lines?: TextLine[];
}

export async function renderPdfPages(bytes: Uint8Array): Promise<RenderedPage[]> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-office-"));
    const input = path.join(dir, "input.pdf");
    try {
        fs.writeFileSync(input, bytes);
        const pages = await withOwnPdfWorker(() =>
            pdfToPng(input, { viewportScale: SCALE })
        );
        return pages
            .filter((p) => p.content)
            .map((p) => ({
                png: p.content as Buffer,
                widthPt: p.width / SCALE,
                heightPt: p.height / SCALE,
            }));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const EMU_PER_PT = 12700;
const TWIPS_PER_PT = 20;

function xmlEscape(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        // Control characters other than tab/newline are not allowed in XML 1.0.
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// ---------------------------------------------------------------- Word

/**
 * A line cut into letter and space stretches, each with the spacing to add
 * after every character in it (points), so Word and PowerPoint draw the line
 * as wide as the PDF: letters get the letter spacing, spaces get the word
 * spacing on top. A line with no extra spacing is one stretch.
 */
export function spacedSegments(line: TextLine): { text: string; extra: number }[] {
    const s = line.spacing;
    if (!s) return [{ text: line.text, extra: 0 }];
    return (line.text.match(/ +|[^ ]+/g) ?? []).map((text) => ({
        text,
        extra: text.startsWith(" ") ? s.letters + s.spaces : s.letters,
    }));
}

/**
 * One line of text as a borderless, transparent text box pinned to the page
 * at the line's position. It grows to fit and never wraps, so editing the
 * words keeps them on one line where they were. Wrapped in
 * mc:AlternateContent the way Word itself writes text boxes.
 */
function docxTextBox(line: TextLine, id: number): string {
    const x = Math.round(line.x * EMU_PER_PT);
    const y = Math.round(line.top * EMU_PER_PT);
    // Office fonts are rarely metrically identical to the PDF's, so leave room.
    const cx = Math.round((line.width * 1.15 + line.size) * EMU_PER_PT);
    const cy = Math.round(line.size * 1.3 * EMU_PER_PT);
    const halfPoints = Math.max(2, Math.round(line.size * 2));
    const font = xmlEscape(line.font);
    // Character spacing is in twentieths of a point, added after each character.
    const rPr = (extra: number) =>
        `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${line.bold ? "<w:b/>" : ""}${line.italic ? "<w:i/>" : ""}<w:color w:val="${line.color}"/>${Math.round(extra * 20) !== 0 ? `<w:spacing w:val="${Math.round(extra * 20)}"/>` : ""}<w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/></w:rPr>`;
    const runs = spacedSegments(line)
        .map((s) => `<w:r>${rPr(s.extra)}<w:t xml:space="preserve">${xmlEscape(s.text)}</w:t></w:r>`)
        .join("");
    return `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Text ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>${runs}</w:p></w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"><a:spAutoFit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback/></mc:AlternateContent></w:r>`;
}

/**
 * Each page becomes its own section, sized to that page with zero margins, and
 * the image is anchored behind the text at the page's top-left corner. An
 * anchored image (rather than an inline one) is what stops Word adding a blank
 * page after each image when it is exactly as tall as the page.
 */
export async function pagesToDocx(pages: RenderedPage[]): Promise<Uint8Array> {
    const zip = new JSZip();

    const body = pages
        .map((page, i) => {
            const n = i + 1;
            const cx = Math.round(page.widthPt * EMU_PER_PT);
            const cy = Math.round(page.heightPt * EMU_PER_PT);
            const sectPr = `<w:sectPr><w:pgSz w:w="${Math.round(page.widthPt * TWIPS_PER_PT)}" w:h="${Math.round(page.heightPt * TWIPS_PER_PT)}"${page.widthPt > page.heightPt ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
            const drawing = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${n}" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${n}" name="Page ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="page${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
            const textBoxes = (page.lines ?? []).map((line, j) => docxTextBox(line, n * 1000 + j)).join("");
            const isLast = i === pages.length - 1;
            // A section ends with the paragraph that carries its sectPr; the
            // last section's sectPr sits directly in the body instead.
            return isLast
                ? `<w:p>${drawing}${textBoxes}</w:p>${sectPr}`
                : `<w:p><w:pPr>${sectPr}</w:pPr>${drawing}${textBoxes}</w:p>`;
        })
        .join("");

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
    );
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    );
    zip.file(
        "word/_rels/document.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pages
            .map(
                (_, i) =>
                    `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.png"/>`
            )
            .join("")}</Relationships>`
    );
    zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><w:body>${body}</w:body></w:document>`
    );
    pages.forEach((page, i) => zip.file(`word/media/page${i + 1}.png`, page.png));

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ---------------------------------------------------------------- PowerPoint

/** One slide per page, the slide sized to the first page, each image fitted inside it. */
export async function pagesToPptx(pages: RenderedPage[], title: string): Promise<Uint8Array> {
    const pptx = new pptxgen();
    pptx.title = title;

    const slideW = pages[0].widthPt / 72;
    const slideH = pages[0].heightPt / 72;
    pptx.defineLayout({ name: "PDF", width: slideW, height: slideH });
    pptx.layout = "PDF";

    for (const page of pages) {
        // Pages of a different shape are scaled to fit and centred rather
        // than stretched.
        const scale = Math.min(slideW / (page.widthPt / 72), slideH / (page.heightPt / 72));
        const w = (page.widthPt / 72) * scale;
        const h = (page.heightPt / 72) * scale;
        const offsetX = (slideW - w) / 2;
        const offsetY = (slideH - h) / 2;
        const slide = pptx.addSlide();
        slide.addImage({
            data: `image/png;base64,${page.png.toString("base64")}`,
            x: offsetX,
            y: offsetY,
            w,
            h,
        });

        // Each line as an editable text box at the same place, same style.
        for (const line of page.lines ?? []) {
            const segments = spacedSegments(line).map((s) => ({
                text: s.text,
                options: s.extra ? { charSpacing: s.extra * scale } : {},
            }));
            slide.addText(segments, {
                x: offsetX + (line.x / 72) * scale,
                y: offsetY + (line.top / 72) * scale,
                w: ((line.width * 1.15 + line.size) / 72) * scale,
                h: ((line.size * 1.3) / 72) * scale,
                fontFace: line.font,
                fontSize: Math.max(1, line.size * scale),
                bold: line.bold,
                italic: line.italic,
                color: line.color,
                margin: 0,
                valign: "top",
                wrap: false,
                fit: "none",
            });
        }
    }

    const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return new Uint8Array(out);
}

// ---------------------------------------------------------------- Excel

export interface XlsxPage {
    widthPt: number;
    heightPt: number;
    /** Text runs grouped by row (lib/pdf-text.ts). */
    rows: TextCell[][];
    /** Table lines drawn on the page (lib/pdf-graphics.ts). */
    hlines: HLine[];
    vlines: VLine[];
    /** Styled text lines, used only to look up font / bold / italic / colour. */
    lines?: TextLine[];
}

/** "A", "B", … "Z", "AA" — the column letters for a 0-based index. */
function columnName(index: number): string {
    let name = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
}

// ---- styles: fonts, borders, alignment ------------------------------------

interface CellFormat {
    size: number;
    font?: string;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    h?: "left" | "center" | "right";
    wrap?: boolean;
    /** Border bitmask: 1 left, 2 right, 4 top, 8 bottom. */
    border?: number;
}

function createStyleBook() {
    const fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>'];
    const fontIndex = new Map<string, number>();
    const borders: number[] = [0];
    const formats: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'];
    const formatIndex = new Map<string, number>();

    const fontId = (f: CellFormat): number => {
        const size = Math.min(72, Math.max(6, Math.round(f.size * 2) / 2));
        const name = f.font || "Calibri";
        const color = f.color && /^[0-9a-fA-F]{6}$/.test(f.color) ? f.color.toUpperCase() : "000000";
        const key = `${name}|${size}|${f.bold ? 1 : 0}|${f.italic ? 1 : 0}|${color}`;
        let id = fontIndex.get(key);
        if (id === undefined) {
            fonts.push(
                `<font>${f.bold ? "<b/>" : ""}${f.italic ? "<i/>" : ""}<sz val="${size}"/><color rgb="FF${color}"/><name val="${xmlEscape(name)}"/><family val="2"/></font>`
            );
            id = fonts.length - 1;
            fontIndex.set(key, id);
        }
        return id;
    };

    const side = (tag: string, on: boolean) =>
        on ? `<${tag} style="thin"><color auto="1"/></${tag}>` : `<${tag}/>`;

    return {
        format(f: CellFormat): number {
            const mask = f.border ?? 0;
            let borderId = borders.indexOf(mask);
            if (borderId < 0) {
                borders.push(mask);
                borderId = borders.length - 1;
            }
            const font = fontId(f);
            const key = `${font}|${borderId}|${f.h ?? ""}|${f.wrap ? 1 : 0}`;
            let id = formatIndex.get(key);
            if (id === undefined) {
                formats.push(
                    `<xf numFmtId="0" fontId="${font}" fillId="0" borderId="${borderId}" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment${f.h ? ` horizontal="${f.h}"` : ""} vertical="center"${f.wrap ? ' wrapText="1"' : ""}/></xf>`
                );
                id = formats.length - 1;
                formatIndex.set(key, id);
            }
            return id;
        },
        xml(): string {
            const borderXml = borders
                .map(
                    (m) =>
                        `<border>${side("left", !!(m & 1))}${side("right", !!(m & 2))}${side("top", !!(m & 4))}${side("bottom", !!(m & 8))}<diagonal/></border>`
                )
                .join("");
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="${borders.length}">${borderXml}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${formats.length}">${formats.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
        },
    };
}

type StyleBook = ReturnType<typeof createStyleBook>;

// ---- helpers --------------------------------------------------------------

/** Plain numbers become real Excel numbers; IDs with leading zeros stay text. */
const NUMBER_PATTERN = /^-?(?:0|[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d*)(?:\.\d+)?$|^-?0\.\d+$/;

function asNumber(text: string): string | null {
    const trimmed = text.trim();
    if (!NUMBER_PATTERN.test(trimmed)) return null;
    const value = trimmed.replace(/,/g, "");
    if (value.replace(/[-.]/g, "").length > 15) return null;
    return value;
}

const GRID_TOLERANCE = 1.5;

function average(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Merges nearly equal coordinates into one grid line. */
function cluster(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const out: number[] = [];
    let group: number[] = [];
    for (const v of sorted) {
        if (group.length && v - group[group.length - 1] > GRID_TOLERANCE) {
            out.push(average(group));
            group = [];
        }
        group.push(v);
    }
    if (group.length) out.push(average(group));
    return out;
}

function nearestIndex(values: number[], v: number): number {
    let best = 0;
    for (let i = 1; i < values.length; i++) {
        if (Math.abs(values[i] - v) < Math.abs(values[best] - v)) best = i;
    }
    return best;
}

function unionIntervals(intervals: [number, number][]): [number, number][] {
    const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    for (const [a, b] of sorted) {
        const last = out[out.length - 1];
        if (last && a <= last[1] + GRID_TOLERANCE) last[1] = Math.max(last[1], b);
        else out.push([a, b]);
    }
    return out;
}

const covers = (intervals: [number, number][], v: number): boolean =>
    intervals.some(([a, b]) => v >= a - 1 && v <= b + 1);

interface RunPiece {
    runs: TextCell[];
}

/** Text runs → lines (top to bottom), each line left to right. */
function groupLines(runs: TextCell[]): TextCell[][] {
    const centre = (r: TextCell) => r.y + (r.size || 12) * 0.35;
    const sorted = [...runs].sort((a, b) => centre(b) - centre(a));
    const lines: TextCell[][] = [];
    for (const run of sorted) {
        const line = lines[lines.length - 1];
        if (line && Math.abs(centre(line[0]) - centre(run)) <= (run.size || 12) * 0.5) line.push(run);
        else lines.push([run]);
    }
    return lines.map((line) => line.sort((a, b) => a.x - b.x));
}

function joinLine(line: TextCell[]): string {
    let text = "";
    let end = Number.NEGATIVE_INFINITY;
    for (const run of line) {
        const size = run.size || 12;
        if (text && run.x - end > size * 0.12 && !/\s$/.test(text)) text += " ";
        text += run.text;
        end = run.x + run.width;
    }
    return text;
}

/** Style of the PDF text line a run belongs to (font, bold, italic, colour). */
function styleFor(page: XlsxPage, run: TextCell): Partial<CellFormat> {
    const baselineFromTop = page.heightPt - run.y;
    for (const line of page.lines ?? []) {
        if (
            run.x >= line.x - 1 &&
            run.x <= line.x + line.width + 1 &&
            Math.abs(baselineFromTop - (line.top + line.size)) <= line.size * 0.8
        ) {
            return { font: line.font, bold: line.bold, italic: line.italic, color: line.color };
        }
    }
    return {};
}

function cellXml(ref: string, style: number, value?: { number: boolean; text: string }): string {
    if (!value) return `<c r="${ref}" s="${style}"/>`;
    return value.number
        ? `<c r="${ref}" s="${style}"><v>${value.text}</v></c>`
        : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value.text)}</t></is></c>`;
}

interface OutRow {
    height: number;
    cells: Map<number, string>;
}

// ---- table pages: the grid comes from the lines drawn in the PDF ---------

interface Region {
    r: number;
    c: number;
    r2: number;
    c2: number;
}

function tableSheetXml(page: XlsxPage, styles: StyleBook): string | null {
    const hlines = page.hlines.filter((l) => l.x2 - l.x1 >= 2);
    const vlines = page.vlines.filter((l) => l.y2 - l.y1 >= 2);
    if (hlines.length < 2 || vlines.length < 2) return null;

    const xs = cluster(vlines.map((l) => l.x));
    const ys = cluster(hlines.map((l) => l.y)).reverse(); // top → bottom
    const cols = xs.length - 1;
    const rows = ys.length - 1;
    if (cols < 1 || rows < 1 || rows * cols > 150_000) return null;

    // Which grid boundaries have a line drawn along them.
    const vEdges: [number, number][][] = xs.map(() => []);
    for (const l of vlines) {
        const k = nearestIndex(xs, l.x);
        if (Math.abs(xs[k] - l.x) <= 3) vEdges[k].push([l.y1, l.y2]);
    }
    const hEdges: [number, number][][] = ys.map(() => []);
    for (const l of hlines) {
        const k = nearestIndex(ys, l.y);
        if (Math.abs(ys[k] - l.y) <= 3) hEdges[k].push([l.x1, l.x2]);
    }
    const vMerged = vEdges.map(unionIntervals);
    const hMerged = hEdges.map(unionIntervals);
    const midY = (r: number) => (ys[r] + ys[r + 1]) / 2;
    const midX = (c: number) => (xs[c] + xs[c + 1]) / 2;
    /** Line on the vertical boundary k (left edge of column k) across row r. */
    const vEdge = (k: number, r: number) => covers(vMerged[k], midY(r));
    /** Line on the horizontal boundary k (top edge of row k) across column c. */
    const hEdge = (k: number, c: number) => covers(hMerged[k], midX(c));

    // Merge cells that have no line between them (titles spanning the table, etc.).
    const claimed = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));
    const owner = Array.from({ length: rows }, () => new Array<number>(cols).fill(-1));
    const regions: Region[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (claimed[r][c]) continue;
            let c2 = c;
            while (c2 + 1 < cols && !vEdge(c2 + 1, r)) c2++;
            let r2 = r;
            while (r2 + 1 < rows) {
                let open = true;
                for (let cc = c; cc <= c2 && open; cc++) {
                    if (hEdge(r2 + 1, cc) || claimed[r2 + 1][cc]) open = false;
                }
                for (let k = c + 1; k <= c2 && open; k++) {
                    if (vEdge(k, r2 + 1)) open = false;
                }
                if (!open) break;
                r2++;
            }
            // Only merge boxes that are really closed on all four sides; empty
            // space between tables stays as plain cells.
            const enclosed = vEdge(c, r) && vEdge(c2 + 1, r) && hEdge(r, c) && hEdge(r2 + 1, c);
            if (!enclosed) {
                c2 = c;
                r2 = r;
            }
            for (let rr = r; rr <= r2; rr++) {
                for (let cc = c; cc <= c2; cc++) {
                    claimed[rr][cc] = true;
                    owner[rr][cc] = regions.length;
                }
            }
            regions.push({ r, c, r2, c2 });
        }
    }

    // Put every text run into the cell it sits in.
    const colOf = (x: number) => {
        let c = 0;
        for (let i = 0; i < cols; i++) if (xs[i] <= x) c = i;
        return c;
    };
    const rowOf = (y: number) => {
        let r = 0;
        for (let i = 0; i < rows; i++) if (ys[i] >= y) r = i;
        return r;
    };

    const byRegion = new Map<number, RunPiece>();
    const above: TextCell[] = [];
    const below: TextCell[] = [];
    for (const run of page.rows.flat()) {
        const size = run.size || 12;
        const cy = run.y + size * 0.35;
        const cx = run.x + run.width / 2;
        if (cy > ys[0] + GRID_TOLERANCE) {
            above.push(run);
        } else if (cy < ys[rows] - GRID_TOLERANCE) {
            below.push(run);
        } else {
            const id = owner[rowOf(cy)][colOf(cx)];
            const piece = byRegion.get(id) ?? { runs: [] };
            piece.runs.push(run);
            byRegion.set(id, piece);
        }
    }

    // Build the sheet: text above the table, the table, text below it.
    const out = new Map<number, OutRow>();
    let rowNo = 0;
    const addRow = (height: number): OutRow => {
        rowNo++;
        const row: OutRow = { height: Math.min(409, Math.max(2, height)), cells: new Map() };
        out.set(rowNo, row);
        return row;
    };
    let maxColumn = cols - 1;
    const merges: string[] = [];

    const freeLines = (runs: TextCell[], previous?: { y: number; size: number }) => {
        let last = previous;
        for (const line of groupLines(runs)) {
            const size = Math.max(8, ...line.map((r) => r.size || 12));
            const y = line[0].y;
            if (last) {
                const extra = last.y - y - size * 1.4;
                if (extra > 4) addRow(extra);
            }
            const row = addRow(size * 1.4);
            const used = new Set<number>();
            // Split the line into cells at wide gaps.
            let cell: TextCell[] = [];
            const flush = () => {
                if (!cell.length) return;
                let col = colOf(cell[0].x);
                while (used.has(col)) col++;
                used.add(col);
                maxColumn = Math.max(maxColumn, col);
                row.cells.set(
                    col,
                    cellXml(
                        `${columnName(col)}${rowNo}`,
                        styles.format({ size, h: "left", ...styleFor(page, cell[0]) }),
                        { number: false, text: joinLine(cell) }
                    )
                );
                cell = [];
            };
            for (const run of line) {
                const prev = cell[cell.length - 1];
                if (prev && run.x - (prev.x + prev.width) > size * 0.7) flush();
                cell.push(run);
            }
            flush();
            last = { y, size };
        }
        return last;
    };

    const lastAbove = freeLines(above);
    if (lastAbove) {
        const gap = lastAbove.y - lastAbove.size * 0.25 - ys[0];
        if (gap > 4) addRow(gap);
    }

    const tableStart = rowNo + 1;
    for (let r = 0; r < rows; r++) addRow(ys[r] - ys[r + 1]);

    regions.forEach((region, id) => {
        const { r, c, r2, c2 } = region;
        const left = vEdge(c, r);
        const right = vEdge(c2 + 1, r);
        const top = hEdge(r, c);
        const bottom = hEdge(r2 + 1, c);

        // Text of the region.
        const runs = byRegion.get(id)?.runs ?? [];
        let value: { number: boolean; text: string } | undefined;
        let format: Partial<CellFormat> = { size: 11 };
        if (runs.length) {
            const lines = groupLines(runs);
            const text = lines.map(joinLine).join("\n");
            const number = lines.length === 1 ? asNumber(text) : null;
            value = number !== null ? { number: true, text: number } : { number: false, text };

            const minX = Math.min(...runs.map((run) => run.x));
            const maxX = Math.max(...runs.map((run) => run.x + run.width));
            const leftGap = minX - xs[c];
            const rightGap = xs[c2 + 1] - maxX;
            const slack = Math.max(3, (xs[c2 + 1] - xs[c]) * 0.12);
            const h: CellFormat["h"] =
                Math.abs(leftGap - rightGap) <= slack ? "center" : rightGap < leftGap * 0.5 ? "right" : "left";
            const biggest = runs.reduce((a, b) => ((b.size || 12) > (a.size || 12) ? b : a));
            format = { size: biggest.size || 12, h, wrap: lines.length > 1, ...styleFor(page, biggest) };
        }

        for (let rr = r; rr <= r2; rr++) {
            for (let cc = c; cc <= c2; cc++) {
                const border =
                    (cc === c && left ? 1 : 0) |
                    (cc === c2 && right ? 2 : 0) |
                    (rr === r && top ? 4 : 0) |
                    (rr === r2 && bottom ? 8 : 0);
                const first = rr === r && cc === c;
                if (!border && !(first && value)) continue;
                const style = styles.format({ size: 11, ...format, border });
                out
                    .get(tableStart + rr)!
                    .cells.set(cc, cellXml(`${columnName(cc)}${tableStart + rr}`, style, first ? value : undefined));
            }
        }
        if (r2 > r || c2 > c) {
            merges.push(`${columnName(c)}${tableStart + r}:${columnName(c2)}${tableStart + r2}`);
        }
    });

    const firstBelow = groupLines(below)[0];
    if (firstBelow) {
        const size = Math.max(8, ...firstBelow.map((r) => r.size || 12));
        const gap = ys[rows] - (firstBelow[0].y + size * 0.75);
        if (gap > 4) addRow(gap);
    }
    freeLines(below);

    // Column widths from the PDF's column positions (Excel: ~7 px per character).
    const colCount = maxColumn + 1;
    const colsXml = Array.from({ length: colCount }, (_, i) => {
        const pt = i < cols ? xs[i + 1] - xs[i] : 60;
        const width = Math.min(255, Math.max(1, (pt * (4 / 3) - 5) / 7));
        return `<col min="${i + 1}" max="${i + 1}" width="${width.toFixed(2)}" customWidth="1"/>`;
    }).join("");

    const sheetRows = [...out.entries()]
        .map(([n, row]) => {
            const cells = [...row.cells.entries()].sort((a, b) => a[0] - b[0]).map(([, xml]) => xml).join("");
            return `<row r="${n}" ht="${row.height.toFixed(2)}" customHeight="1">${cells}</row>`;
        })
        .join("");

    const landscape = page.widthPt > page.heightPt;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${columnName(maxColumn)}${rowNo}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${colsXml}</cols><sheetData>${sheetRows}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""
        }<pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

// ---- pages without table lines: position-based text grid ------------------

interface EditableCell {
    x: number;
    text: string;
    size: number;
    end: number;
}

interface SheetLine {
    cells: EditableCell[];
    y: number;
    size: number;
}

function editableCells(runs: TextCell[]): EditableCell[] {
    const cells: EditableCell[] = [];
    for (const run of [...runs].sort((a, b) => a.x - b.x)) {
        const previous = cells[cells.length - 1];
        const size = run.size || previous?.size || 12;
        const gap = previous ? run.x - previous.end : Number.POSITIVE_INFINITY;
        if (previous && gap <= Math.max(2, size * 0.7)) {
            previous.text += (gap > size * 0.12 && !/\s$/.test(previous.text) ? " " : "") + run.text;
            previous.end = Math.max(previous.end, run.x + run.width);
            previous.size = Math.max(previous.size, size);
        } else {
            cells.push({ x: run.x, text: run.text, size, end: run.x + run.width });
        }
    }
    return cells;
}

function columnStarts(lines: SheetLine[]): number[] {
    const tableRows = lines.filter((line) => line.cells.length > 1);
    const source = tableRows.length > 0 ? tableRows : lines;
    const spans = source
        .flatMap((line) => line.cells.map((cell) => [cell.x, cell.end] as const))
        .sort((a, b) => a[0] - b[0]);
    const starts: number[] = [];
    let end = Number.NEGATIVE_INFINITY;
    for (const [from, to] of spans) {
        if (from > end + 4) starts.push(from);
        end = Math.max(end, to);
    }
    if (starts.length === 0) starts.push(0);
    if (starts.length > 16_384) {
        throw new Error("This PDF page has too many columns to fit in an Excel worksheet.");
    }
    return starts;
}

function textSheetXml(page: XlsxPage, styles: StyleBook): string {
    const header = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`;
    const lines: SheetLine[] = page.rows
        .filter((runs) => runs.length > 0)
        .map((runs) => {
            const cells = editableCells(runs);
            return { cells, y: runs[0].y, size: Math.max(8, ...cells.map((cell) => cell.size)) };
        });

    if (lines.length === 0) {
        return `${header}<sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>No selectable text was found on this page. Scanned pages need OCR before their contents can be edited.</t></is></c></row></sheetData></worksheet>`;
    }

    const starts = columnStarts(lines);
    const needed: number[] = starts.map(() => 0);
    let maxColumn = 0;
    let rowNumber = 0;
    const sheetRows: string[] = [];

    lines.forEach((line, lineIndex) => {
        rowNumber++;
        const occupied = new Set<number>();
        const placed: { column: number; xml: string }[] = [];

        for (const cell of line.cells) {
            let column = 0;
            for (let i = 0; i < starts.length; i++) if (starts[i] <= cell.x + 2) column = i;
            while (occupied.has(column)) column++;
            if (column >= 16_384) {
                throw new Error("This PDF page has too many text columns to fit in an Excel worksheet.");
            }
            occupied.add(column);
            maxColumn = Math.max(maxColumn, column);

            const ref = `${columnName(column)}${rowNumber}`;
            const number = asNumber(cell.text);
            if (number !== null) {
                if (column < needed.length) {
                    needed[column] = Math.max(needed[column], ((number.length * cell.size) / 11) * 1.15 + 2);
                }
                placed.push({
                    column,
                    xml: cellXml(ref, styles.format({ size: cell.size, h: "right" }), { number: true, text: number }),
                });
            } else {
                placed.push({
                    column,
                    xml: cellXml(ref, styles.format({ size: cell.size }), { number: false, text: cell.text }),
                });
            }
        }

        placed.sort((a, b) => a.column - b.column);
        const height = Math.min(409, Math.max(12, line.size * 1.35));
        sheetRows.push(
            `<row r="${rowNumber}" ht="${height.toFixed(2)}" customHeight="1">${placed.map((p) => p.xml).join("")}</row>`
        );

        const next = lines[lineIndex + 1];
        if (next) {
            const gap = line.y - next.y;
            if (Number.isFinite(gap) && gap > line.size * 2.2) {
                rowNumber++;
                sheetRows.push(`<row r="${rowNumber}" ht="${height.toFixed(2)}" customHeight="1"/>`);
            }
        }
    });

    const columnCount = Math.max(starts.length, maxColumn + 1);
    const cols = Array.from({ length: columnCount }, (_, i) => {
        const bandEnd = starts[i + 1] ?? page.widthPt;
        const bandChars = (i < starts.length ? bandEnd - starts[i] : 40) / 5.25;
        const width = Math.min(100, Math.max(3, bandChars, needed[i] ?? 0));
        return `<col min="${i + 1}" max="${i + 1}" width="${width.toFixed(2)}" customWidth="1"/>`;
    }).join("");

    const landscape = page.widthPt > page.heightPt;
    return `${header}<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${columnName(maxColumn)}${rowNumber}"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${cols}</cols><sheetData>${sheetRows.join("")}</sheetData><pageMargins left="0.4" right="0.4" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

// ---- workbook -------------------------------------------------------------

/** One editable worksheet per PDF page: the table as drawn if there is one, otherwise a text grid. */
export async function pagesToXlsx(pages: XlsxPage[]): Promise<Uint8Array> {
    const zip = new JSZip();
    const styles = createStyleBook();
    const sheetNames = pages.map((_, i) => `Page ${i + 1}`);

    pages.forEach((page, i) => {
        zip.file(`xl/worksheets/sheet${i + 1}.xml`, tableSheetXml(page, styles) ?? textSheetXml(page, styles));
    });

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetNames
            .map(
                (_, i) =>
                    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
            )
            .join("")}</Types>`
    );
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    );
    zip.file(
        "xl/workbook.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames
            .map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
            .join("")}</sheets></workbook>`
    );
    zip.file(
        "xl/_rels/workbook.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames
            .map(
                (_, i) =>
                    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
            )
            .join("")}<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    );
    // Written last: the style book fills up while the sheets are generated.
    zip.file("xl/styles.xml", styles.xml());

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}