import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { LibreOfficeMissingError, officeToPdf } from "@/lib/office-to-pdf";
import { extractPageCells } from "@/lib/pdf-text";
import { pagesToDocx, pagesToPptx, pagesToXlsx, renderPdfPages } from "@/lib/pdf-to-office";
import { contentDisposition, rejectBadUpload, type AcceptKind } from "@/lib/uploads";

/**
 * The request handling shared by the six format converters, so they all check
 * uploads, name their output and report failures the same way. Each route file
 * is then one line: which kind of file in, which format out.
 */

function baseName(file: File): string {
    return file.name.replace(/\.[^/.]+$/, "") || "document";
}

async function readUpload(req: NextRequest, kind: AcceptKind): Promise<File | NextResponse> {
    const formData = await readFormData(req);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    return rejectBadUpload(file, kind) ?? file;
}

/** Word / Excel / PowerPoint in, PDF out — rendered by LibreOffice. */
export async function officeToPdfRoute(req: NextRequest, kind: AcceptKind): Promise<Response> {
    const file = await readUpload(req, kind);
    if (file instanceof NextResponse) return file;

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

    let pdf: Uint8Array;
    try {
        pdf = await officeToPdf(new Uint8Array(await file.arrayBuffer()), extension);
    } catch (error) {
        if (error instanceof LibreOfficeMissingError) {
            console.error(error.message);
            return NextResponse.json(
                { error: "This converter is not available on the server right now. Please try again later." },
                { status: 503 }
            );
        }
        console.error(`${kind} to PDF failed:`, error);
        return NextResponse.json(
            { error: "Could not convert that file. It may be damaged or password-protected." },
            { status: 400 }
        );
    }

    return new NextResponse(Buffer.from(pdf), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": contentDisposition(`${baseName(file)}.pdf`),
        },
    });
}

const OUTPUT = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

/** PDF in, Word / PowerPoint / Excel out — each page placed as it looks in the PDF. */
export async function pdfToOfficeRoute(
    req: NextRequest,
    format: keyof typeof OUTPUT
): Promise<Response> {
    const file = await readUpload(req, "pdf");
    if (file instanceof NextResponse) return file;

    const bytes = new Uint8Array(await file.arrayBuffer());

    let output: Uint8Array;
    try {
        const pages = await renderPdfPages(bytes.slice());
        if (pages.length === 0) throw new Error("The PDF has no pages.");

        if (format === "docx") {
            output = await pagesToDocx(pages);
        } else if (format === "pptx") {
            output = await pagesToPptx(pages, baseName(file));
        } else {
            // One row per line of text, one cell per run, across all pages.
            const cells = await extractPageCells(bytes.slice()).catch(() => []);
            const rows = cells.flatMap((page) =>
                page.map((row) => row.map((cell) => cell.text)).filter((row) => row.some(Boolean))
            );
            output = await pagesToXlsx(pages, rows);
        }
    } catch (error) {
        console.error(`PDF to ${format} failed:`, error);
        return NextResponse.json(
            { error: "Could not read that PDF. It may be damaged or password-protected." },
            { status: 400 }
        );
    }

    return new NextResponse(Buffer.from(output), {
        headers: {
            "Content-Type": OUTPUT[format],
            "Content-Disposition": contentDisposition(`${baseName(file)}.${format}`),
        },
    });
}
