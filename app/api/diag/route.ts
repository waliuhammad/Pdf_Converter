// TEMPORARY: reports why page rendering fails on the host. No secrets.
import { PDFDocument, StandardFonts } from "pdf-lib";
import { renderPdfPages } from "@/lib/pdf-to-office";
import { readTextLayout, stripPdfText } from "@/lib/pdf-layout";

export const dynamic = "force-dynamic";

const trace = (e: unknown) => String((e as Error)?.stack ?? e).split("\n").slice(0, 10);

export async function GET() {
    const doc = await PDFDocument.create();
    const page = doc.addPage([300, 200]);
    page.drawText("Hello", { x: 20, y: 100, size: 20, font: await doc.embedFont(StandardFonts.Helvetica) });
    const bytes = await doc.save();
    const out: Record<string, unknown> = { node: process.version };
    for (const [name, run] of [
        ["render", () => renderPdfPages(bytes.slice()).then((p) => `${p.length} page(s), ${p[0]?.png.length} bytes`)],
        ["strip", () => stripPdfText(bytes.slice()).then((b) => `${b.length} bytes`)],
        ["layout", () => readTextLayout(bytes.slice()).then((p) => JSON.stringify(p[0]?.lines.map((l) => l.text)))],
    ] as const) {
        try {
            out[name] = await run();
        } catch (e) {
            out[name] = trace(e);
        }
    }
    return Response.json(out);
}
