import "server-only";
import os from "os";
import path from "path";
import sharp from "sharp";
import type { TextLine } from "@/lib/pdf-layout";

/**
 * Editable text for scanned pages.
 *
 * A scanned certificate or licence is a picture: there is no text in the PDF
 * for readTextLayout to find, so PDF to Word could only place the page image
 * and nothing in the .docx could be edited. Here the page is read with
 * tesseract.js; each recognised line becomes a TextLine (position, size,
 * colour), and the line is painted out of the background image with the
 * surrounding paper colour, so the editable text box laid on top is not
 * doubled by the printed letters underneath.
 */

/** Lines read with less confidence than this are left in the image as they are. */
const MIN_CONFIDENCE = 60;

interface OcrLine {
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    baseline?: { x0: number; y0: number; x1: number; y1: number };
}

interface OcrResult {
    lines: TextLine[];
    /** The page image with the recognised lines painted out (PNG). */
    background: Buffer;
}

function hex(r: number, g: number, b: number): string {
    return [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Recognise the text on a rendered page.
 *
 * @param png   the page rendered at `scale` pixels per PDF point
 * @param scale render scale (RenderedPage widthPt × scale = image width)
 */
export async function ocrPageImage(png: Buffer, scale: number, languages = "eng"): Promise<OcrResult> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker(languages, 1, {
        // Language data is downloaded once and kept here.
        cachePath: path.join(os.tmpdir(), "pdfai-tesseract"),
    });

    let ocrLines: OcrLine[] = [];
    try {
        const { data } = await worker.recognize(png, {}, { blocks: true });
        for (const block of data.blocks ?? []) {
            for (const para of block.paragraphs) {
                for (const line of para.lines) {
                    if (line.text.trim() && line.confidence >= MIN_CONFIDENCE) ocrLines.push(line);
                }
            }
        }
    } finally {
        await worker.terminate();
    }

    const image = sharp(png).flatten({ background: "#ffffff" });
    const { width, height } = await image.metadata();
    const raw = await image.removeAlpha().raw().toBuffer();
    const W = width ?? 1;
    const H = height ?? 1;
    const px = (x: number, y: number) => {
        const i = (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 3;
        return [raw[i], raw[i + 1], raw[i + 2]] as const;
    };
    const lum = ([r, g, b]: readonly number[]) => 0.299 * r + 0.587 * g + 0.114 * b;

    ocrLines = ocrLines.filter((l) => l.bbox.x1 > l.bbox.x0 && l.bbox.y1 > l.bbox.y0);
    const patches: sharp.OverlayOptions[] = [];
    const lines: TextLine[] = [];

    for (const l of ocrLines) {
        const { x0, y0, x1, y1 } = l.bbox;
        const pad = Math.max(2, Math.round((y1 - y0) * 0.12));

        // Paper colour: the median of a ring of pixels just outside the box.
        const ring: (readonly number[])[] = [];
        for (let x = x0 - pad; x <= x1 + pad; x += 3) ring.push(px(x, y0 - pad - 1), px(x, y1 + pad + 1));
        for (let y = y0 - pad; y <= y1 + pad; y += 3) ring.push(px(x0 - pad - 1, y), px(x1 + pad + 1, y));
        ring.sort((a, b) => lum(a) - lum(b));
        const paper = ring[Math.floor(ring.length / 2)] ?? [255, 255, 255];

        // Ink colour: the average of the darkest-contrast pixels inside the box.
        const inside: (readonly number[])[] = [];
        for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) inside.push(px(x, y));
        const paperLum = lum(paper);
        inside.sort((a, b) => Math.abs(lum(b) - paperLum) - Math.abs(lum(a) - paperLum));
        const ink = inside.slice(0, Math.max(1, Math.floor(inside.length * 0.08)));
        const avg = [0, 1, 2].map((c) => ink.reduce((s, p) => s + p[c], 0) / ink.length);

        const boxW = x1 - x0 + pad * 2;
        const boxH = y1 - y0 + pad * 2;
        patches.push({
            input: { create: { width: boxW, height: boxH, channels: 3, background: { r: paper[0], g: paper[1], b: paper[2] } } },
            left: Math.max(0, x0 - pad),
            top: Math.max(0, y0 - pad),
        });

        // Size from the top of the line down to its baseline (≈ 0.72 em):
        // the whole box also takes in descenders ("y", "g", commas), so a line
        // that happens to have them came out several points too big.
        const baselineY = l.baseline && l.baseline.y0 > y0 ? Math.max(l.baseline.y0, l.baseline.y1) : null;
        const size = baselineY !== null ? (baselineY - y0) / scale / 0.72 : (y1 - y0) / scale / 1.15;
        lines.push({
            text: l.text.replace(/\s+/g, " ").trim(),
            x: x0 / scale,
            top: y0 / scale,
            width: (x1 - x0) / scale,
            size,
            font: "Arial",
            bold: false,
            italic: false,
            color: hex(avg[0], avg[1], avg[2]),
        });
    }

    const background = patches.length
        ? await sharp(png).flatten({ background: "#ffffff" }).composite(patches).png().toBuffer()
        : png;
    return { lines, background };
}
