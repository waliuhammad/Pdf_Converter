import "server-only";
import sharp from "sharp";
import type { TextLine } from "@/lib/pdf-layout";

/**
 * The colour each line of text is really drawn in, read from the page itself.
 *
 * readTextLayout guesses colours by matching text to the PDF's drawing
 * commands, and on many generated PDFs (bank statements, reports) the match
 * drifts: white table headings came out dark and grey captions came out in the
 * heading's blue. The page is rendered twice anyway — once whole and once
 * without its text — so the difference between the two inside a line's box is
 * exactly the ink of that line. The strongest-differing pixels are the cores
 * of the glyphs, away from anti-aliased edges, and their colour is the text
 * colour, whatever the PDF's colour space or drawing order.
 */

/** A pixel counts as ink when the two renders differ by more than this (sum over RGB). */
const MIN_DIFF = 60;

interface Raw {
    data: Buffer;
    width: number;
    height: number;
    channels: number;
}

async function raw(png: Buffer): Promise<Raw> {
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, channels: info.channels };
}

function hex(r: number, g: number, b: number): string {
    return [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/**
 * Lines with their colour read from the renders. `full` is the page as drawn,
 * `artwork` the same page without text, both at `scale` pixels per point.
 * Lines where no ink is found keep the colour they had.
 */
export async function colourLinesFromRender(
    lines: TextLine[],
    full: Buffer,
    artwork: Buffer,
    scale: number
): Promise<TextLine[]> {
    const [a, b] = await Promise.all([raw(full), raw(artwork)]);
    if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) return lines;
    const { width, height, channels } = a;

    return lines.map((line) => {
        const x0 = Math.max(0, Math.floor(line.x * scale));
        const x1 = Math.min(width, Math.ceil((line.x + line.width) * scale));
        const y0 = Math.max(0, Math.floor(line.top * scale));
        const y1 = Math.min(height, Math.ceil((line.top + line.size * 1.05) * scale));

        const ink: { diff: number; i: number }[] = [];
        let max = 0;
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * width + x) * channels;
                const diff =
                    Math.abs(a.data[i] - b.data[i]) +
                    Math.abs(a.data[i + 1] - b.data[i + 1]) +
                    Math.abs(a.data[i + 2] - b.data[i + 2]);
                if (diff > MIN_DIFF) {
                    ink.push({ diff, i });
                    if (diff > max) max = diff;
                }
            }
        }
        if (ink.length === 0) return line;

        const core = ink.filter((p) => p.diff >= max * 0.8);
        let r = 0, g = 0, bl = 0;
        for (const { i } of core) {
            r += a.data[i];
            g += a.data[i + 1];
            bl += a.data[i + 2];
        }
        return { ...line, color: hex(r / core.length, g / core.length, bl / core.length) };
    });
}
