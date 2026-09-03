import { NextRequest, NextResponse } from "next/server";
import { metered } from "@/lib/metered";
import { docxToPdf } from "@/lib/docx-to-pdf";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

export const runtime = "nodejs";

// Reading and re-laying out a long document is not instant.
export const maxDuration = 60;

/**
 * Converts here rather than posting the document to ConvertAPI.
 *
 * This route required CONVERTAPI_SECRET and answered 503 without it, so the
 * tool did nothing at all. It also meant every uploaded document was sent to a
 * third party. A .docx is a zip of XML, so it does not have to leave.
 */
export const POST = metered(async (req: NextRequest) => {
    try {
        // Every tool counts against the user's daily allowance (2/20/50 by
        // plan, from Remote Config) and therefore requires sign-in.

        // formData() throws outright on a request with no multipart body, so a
        // missing file has to be caught here or it surfaces as a 500.
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return NextResponse.json({ error: "No Word file provided." }, { status: 400 });
        }

        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No Word file provided." }, { status: 400 });
        }

        // Size and type are checked here, before anything reads the bytes.
        const badUpload = rejectBadUpload(file, "word");
        if (badUpload) return badUpload;

        const name = file.name.toLowerCase();
        if (!name.endsWith(".docx")) {
            // .doc is the old binary format — a different problem entirely.
            return NextResponse.json(
                {
                    error: name.endsWith(".doc")
                        ? "Only .docx is supported. Open the file in Word and save it as .docx."
                        : "That file is not a Word document.",
                },
                { status: 415 }
            );
        }

        let pdf: Uint8Array;
        try {
            pdf = await docxToPdf(new Uint8Array(await file.arrayBuffer()));
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Could not read that document." },
                { status: 400 }
            );
        }

        const base = file.name.replace(/\.[^/.]+$/, "") || "document";

        return new NextResponse(Buffer.from(pdf), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": contentDisposition(`${base}.pdf`),
            },
        });
    } catch (error) {
        console.error("Word to PDF error:", error);
        return NextResponse.json(
            { error: "Failed to convert the document." },
            { status: 500 }
        );
    }
});