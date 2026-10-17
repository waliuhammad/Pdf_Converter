/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";

export interface HLine { y: number; x1: number; x2: number }
export interface VLine { x: number; y1: number; y2: number }
export interface PageGraphics {
    widthPt: number;
    heightPt: number;
    hlines: HLine[];
    vlines: VLine[];
}

type Matrix = [number, number, number, number, number, number];
type Pt = [number, number];

/** A filled rectangle thinner than this is a ruled line, not a box. */
const THIN = 3;
const AXIS = 0.6;

/** m is applied first, then n. */
function multiply(m: Matrix, n: Matrix): Matrix {
    return [
        m[0] * n[0] + m[1] * n[2],
        m[0] * n[1] + m[1] * n[3],
        m[2] * n[0] + m[3] * n[2],
        m[2] * n[1] + m[3] * n[3],
        m[4] * n[0] + m[5] * n[2] + n[4],
        m[4] * n[1] + m[5] * n[3] + n[5],
    ];
}

function collect(subpaths: Pt[][], stroke: boolean, fill: boolean, h: HLine[], v: VLine[]): void {
    const addH = (y: number, a: number, b: number) => {
        const x1 = Math.min(a, b), x2 = Math.max(a, b);
        if (x2 - x1 >= 2) h.push({ y, x1, x2 });
    };
    const addV = (x: number, a: number, b: number) => {
        const y1 = Math.min(a, b), y2 = Math.max(a, b);
        if (y2 - y1 >= 2) v.push({ x, y1, y2 });
    };

    for (const pts of subpaths) {
        if (pts.length < 2) continue;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);

        const rectLike =
            (pts.length === 4 || pts.length === 5) &&
            pts.every((p, i) => {
                const q = pts[(i + 1) % pts.length];
                return Math.abs(p[0] - q[0]) <= AXIS || Math.abs(p[1] - q[1]) <= AXIS;
            });

        if (rectLike && (fill || stroke)) {
            const w = maxX - minX;
            const hgt = maxY - minY;
            if (hgt <= THIN && w > hgt) addH((minY + maxY) / 2, minX, maxX);
            else if (w <= THIN && hgt > w) addV((minX + maxX) / 2, minY, maxY);
            else if (stroke) {
                addH(minY, minX, maxX);
                addH(maxY, minX, maxX);
                addV(minX, minY, maxY);
                addV(maxX, minY, maxY);
            }
            continue;
        }

        if (stroke) {
            for (let i = 0; i < pts.length - 1; i++) {
                const a = pts[i], b = pts[i + 1];
                if (Math.abs(a[1] - b[1]) <= AXIS) addH((a[1] + b[1]) / 2, a[0], b[0]);
                else if (Math.abs(a[0] - b[0]) <= AXIS) addV((a[0] + b[0]) / 2, a[1], b[1]);
            }
        }
    }
}

function readOperators(OPS: any, list: { fnArray: number[]; argsArray: any[] }) {
    const hlines: HLine[] = [];
    const vlines: VLine[] = [];
    let ctm: Matrix = [1, 0, 0, 1, 0, 0];
    const stack: Matrix[] = [];
    let current: Pt[][] = [];

    const strokeOps = new Set<number>([
        OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke,
    ]);
    const fillOps = new Set<number>([
        OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke,
    ]);

    const apply = (x: number, y: number): Pt => [
        ctm[0] * x + ctm[2] * y + ctm[4],
        ctm[1] * x + ctm[3] * y + ctm[5],
    ];

    const paint = (op: number) => {
        collect(current, strokeOps.has(op), fillOps.has(op), hlines, vlines);
        current = [];
    };

    // pdf.js 4.x: args = [ops[], coords[]]
    const addPathV4 = (ops: number[], c: ArrayLike<number>) => {
        let k = 0;
        let sub: Pt[] | null = null;
        for (const op of ops) {
            if (op === OPS.moveTo) {
                sub = [apply(c[k], c[k + 1])];
                current.push(sub);
                k += 2;
            } else if (op === OPS.lineTo) {
                sub?.push(apply(c[k], c[k + 1]));
                k += 2;
            } else if (op === OPS.curveTo) {
                sub?.push(apply(c[k + 4], c[k + 5]));
                k += 6;
            } else if (op === OPS.curveTo2 || op === OPS.curveTo3) {
                sub?.push(apply(c[k + 2], c[k + 3]));
                k += 4;
            } else if (op === OPS.rectangle) {
                const x = c[k], y = c[k + 1], w = c[k + 2], h = c[k + 3];
                sub = [apply(x, y), apply(x + w, y), apply(x + w, y + h), apply(x, y + h), apply(x, y)];
                current.push(sub);
                k += 4;
            } else if (op === OPS.closePath) {
                if (sub && sub.length) sub.push(sub[0]);
            }
        }
    };

    // pdf.js 5.x: args = [paintOp, [Float32Array], minMax]; 0 move, 1 line, 2 curve, 3 quad, 4 close
    const addPathV5 = (d: ArrayLike<number>) => {
        let k = 0;
        let sub: Pt[] | null = null;
        while (k < d.length) {
            const code = d[k++];
            if (code === 0) {
                sub = [apply(d[k], d[k + 1])];
                current.push(sub);
                k += 2;
            } else if (code === 1) {
                sub?.push(apply(d[k], d[k + 1]));
                k += 2;
            } else if (code === 2) {
                sub?.push(apply(d[k + 4], d[k + 5]));
                k += 6;
            } else if (code === 3) {
                sub?.push(apply(d[k + 2], d[k + 3]));
                k += 4;
            } else if (code === 4) {
                if (sub && sub.length) sub.push(sub[0]);
            } else {
                break;
            }
        }
    };

    for (let i = 0; i < list.fnArray.length; i++) {
        const fn = list.fnArray[i];
        const args = list.argsArray[i];
        if (fn === OPS.save) stack.push([...ctm] as Matrix);
        else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.transform) ctm = multiply(args as Matrix, ctm);
        else if (fn === OPS.paintFormXObjectBegin) {
            stack.push([...ctm] as Matrix);
            if (Array.isArray(args?.[0])) ctm = multiply(args[0] as Matrix, ctm);
        } else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.constructPath) {
            if (typeof args[0] === "number") {
                const data = Array.isArray(args[1]) && args[1][0] && typeof args[1][0] === "object" ? args[1][0] : args[1];
                addPathV5(data);
                paint(args[0]);
            } else {
                addPathV4(args[0], args[1]);
            }
        } else if (strokeOps.has(fn) || fillOps.has(fn) || fn === OPS.endPath) {
            paint(fn);
        }
    }

    return { hlines, vlines };
}

/**
 * The ruled lines of every page (table borders, drawn either as strokes or as
 * hair-thin filled rectangles), in PDF points with the origin at the bottom left —
 * the same coordinates the text cells use.
 *
 * Pass a copy of the bytes (`bytes.slice()`); pdf.js takes ownership of the buffer.
 */
export async function extractPageGraphics(bytes: Uint8Array): Promise<PageGraphics[]> {
    return withOwnPdfWorker(async () => {
        // Use the same pdf.js build that lib/pdf-text.ts and lib/pdf-layout.ts use.
        const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.js") as any;
        const doc = await getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
        try {
            const pages: PageGraphics[] = [];
            for (let n = 1; n <= doc.numPages; n++) {
                const page = await doc.getPage(n);
                const [x0, y0, x1, y1] = page.view as number[];
                const list = await page.getOperatorList();
                const { hlines, vlines } = readOperators(OPS, list);
                pages.push({ widthPt: x1 - x0, heightPt: y1 - y0, hlines, vlines });
                page.cleanup();
            }
            return pages;
        } finally {
            await doc.destroy();
        }
    });
}