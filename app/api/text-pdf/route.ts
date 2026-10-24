import { NextRequest, NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase/admin";
import { getRequestUid } from "@/lib/server-auth";
import { contentDisposition } from "@/lib/uploads";
import { textDocumentToPdf } from "@/lib/unicode-pdf-text";

export const runtime = "nodejs";

/** A long translation is fine; a megabyte of text is not a summary. */
const MAX_CHARS = 200_000;

/**
 * Turn an AI result (translation, summary, OCR text) into a PDF on the server.
 *
 * The browser builds PDFs with jsPDF's standard fonts, which only cover
 * Latin-1 — Urdu, Arabic, Hindi or Chinese came out missing or as separated,
 * unjoined letters. Here the text is laid out with a real font and proper
 * shaping (lib/unicode-pdf-text.ts). Not metered: it formats a result the user
 * already paid an operation for. Signed-in users only, so it is not an open
 * PDF printer.
 */
export async function POST(req: NextRequest) {
    if (isAdminConfigured() && !(await getRequestUid(req))) {
        return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    let body: { title?: unknown; sourceName?: unknown; bullets?: unknown; text?: unknown; fileName?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
    }

    const title = typeof body.title === "string" ? body.title.slice(0, 200) : "Document";
    const sourceName = typeof body.sourceName === "string" ? body.sourceName.slice(0, 300) : "document";
    const bullets = Array.isArray(body.bullets) ? body.bullets.map(String) : undefined;
    const text = typeof body.text === "string" ? body.text : undefined;
    if (!bullets && text === undefined) {
        return NextResponse.json({ error: "Nothing to put in the PDF." }, { status: 400 });
    }
    const size = (bullets?.join("").length ?? 0) + (text?.length ?? 0);
    if (size > MAX_CHARS) {
        return NextResponse.json({ error: "That text is too long to turn into a PDF." }, { status: 413 });
    }

    try {
        const pdf = await textDocumentToPdf({ title, sourceName, bullets, text });
        const fileName = typeof body.fileName === "string" && body.fileName.trim() ? body.fileName : "document.pdf";
        return new NextResponse(Buffer.from(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": contentDisposition(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`),
            },
        });
    } catch (error) {
        console.error("text-pdf failed:", error);
        return NextResponse.json({ error: "Could not create the PDF." }, { status: 500 });
    }
}
