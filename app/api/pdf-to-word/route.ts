import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { pdfToDocx } from "@/lib/pdf-to-docx";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

export const runtime = "nodejs";

// Reading every page of a long document is not instant.
export const maxDuration = 60;

/**
 * Converts here rather than posting the document to ConvertAPI.
 *
 * This route required CONVERTAPI_SECRET and answered 503 without it, so the
 * tool did nothing, and every uploaded document went to a third party.
 */
export const POST = metered(async (req: NextRequest) => {
    try {
        // Every tool counts against the user's daily allowance (2/20/50 by
        // plan, from Remote Config) and therefore requires sign-in.

        const formData = await readFormData(req);
        if (!formData) {
            return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
        }

        const file = formData.get("file") as File | null;
        if (!file) {
            return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
        }

        // Size and type are checked here, before anything reads the bytes.
        const badUpload = rejectBadUpload(file, "pdf");
        if (badUpload) return badUpload;

        let docx: Uint8Array;
        try {
            docx = await pdfToDocx(new Uint8Array(await file.arrayBuffer()));
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Could not read that PDF." },
                { status: 400 }
            );
        }

        const base = file.name.replace(/\.[^/.]+$/, "") || "document";

        return new NextResponse(Buffer.from(docx), {
            status: 200,
            headers: {
                "Content-Type":
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": contentDisposition(`${base}.docx`),
            },
        });
    } catch (error) {
        console.error("PDF to Word error:", error);
        return NextResponse.json(
            { error: "Failed to convert the document." },
            { status: 500 }
        );
    }
});