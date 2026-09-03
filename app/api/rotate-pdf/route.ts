import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { PDFDocument, degrees } from "pdf-lib";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

/**
 * Rotation is a change to one number in each page's dictionary, so pdf-lib does
 * it here. This used to POST the document to ConvertAPI and download the result
 * back, which meant the tool was dead without a paid key and sent every
 * uploaded file to a third party to do arithmetic.
 */
export const POST = metered(async (req: NextRequest) => {
    try {
        // Every tool counts against the user's daily allowance (2/20/50 by
        // plan, from Remote Config) and therefore requires sign-in.

        const formData = await readFormData(req);
        if (!formData) {
            return NextResponse.json({ error: "No file provided." }, { status: 400 });
        }
        const file = formData.get("file") as File | null;
        const rotation = parseInt((formData.get("rotation") as string) || "90", 10);
        const mode = (formData.get("mode") as string) || "all";
        const pageNumber = ((formData.get("pageNumber") as string) || "").trim();

        if (!file) {
            return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
        }

        // Size and type are checked here, before anything reads the bytes.
        const badUpload = rejectBadUpload(file, "pdf");
        if (badUpload) return badUpload;

        if (!Number.isFinite(rotation) || rotation % 90 !== 0) {
            return NextResponse.json(
                { error: "Rotation must be a multiple of 90 degrees." },
                { status: 400 }
            );
        }

        let pdf: PDFDocument;
        try {
            pdf = await PDFDocument.load(await file.arrayBuffer());
        } catch {
            return NextResponse.json(
                { error: "That file could not be read as a PDF." },
                { status: 400 }
            );
        }

        const pages = pdf.getPages();

        // "custom" takes a page list like "1, 3, 5-7".
        let targets: number[];
        if (mode === "custom" && pageNumber !== "") {
            targets = parsePageList(pageNumber, pages.length);
            if (targets.length === 0) {
                return NextResponse.json(
                    {
                        error: `No valid pages in "${pageNumber}". This PDF has ${pages.length} page${pages.length === 1 ? "" : "s"}.`,
                    },
                    { status: 400 }
                );
            }
        } else {
            targets = pages.map((_, i) => i);
        }

        for (const i of targets) {
            // Rotation is cumulative on whatever the page already carried.
            const current = pages[i].getRotation().angle;
            pages[i].setRotation(degrees(normalise(current + rotation)));
        }

        const bytes = await pdf.save();
        const base = file.name.replace(/\.[^/.]+$/, "") || "document";

        return new NextResponse(Buffer.from(bytes), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": contentDisposition(`${base}_rotated.pdf`),
            },
        });
    } catch (error) {
        console.error("Rotate PDF error:", error);
        return NextResponse.json(
            { error: "Failed to rotate PDF file due to an internal server error." },
            { status: 500 }
        );
    }
});

/** pdf-lib rejects negative angles, and 360 should mean "unchanged". */
function normalise(angle: number): number {
    return ((angle % 360) + 360) % 360;
}

/** "1, 3, 5-7" -> zero-based indexes, out-of-range entries dropped. */
function parsePageList(spec: string, total: number): number[] {
    const out = new Set<number>();

    for (const part of spec.split(",")) {
        const chunk = part.trim();
        if (!chunk) continue;

        const range = chunk.match(/^(\d+)\s*-\s*(\d+)$/);
        if (range) {
            const from = parseInt(range[1], 10);
            const to = parseInt(range[2], 10);
            for (let p = Math.min(from, to); p <= Math.max(from, to); p++) {
                if (p >= 1 && p <= total) out.add(p - 1);
            }
            continue;
        }

        const single = parseInt(chunk, 10);
        if (Number.isFinite(single) && single >= 1 && single <= total) out.add(single - 1);
    }

    return [...out].sort((a, b) => a - b);
}