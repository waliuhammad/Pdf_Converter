import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { LibreOfficeMissingError, officeToPdf } from "@/lib/office-to-pdf";
import { extractPageCells } from "@/lib/pdf-text";
import { readTextLayout, stripPdfText } from "@/lib/pdf-layout";
import { extractPageGraphics } from "@/lib/pdf-graphics";
import {
    pagesToDocx,
    pagesToPptx,
    pagesToXlsx,
    renderPdfPages,
    type RenderedPage,
} from "@/lib/pdf-to-office";
import { contentDisposition, rejectBadUpload, type AcceptKind } from "@/lib/uploads";

/**
 * The request handling shared by the six format converters, so they all check
 * uploads, name their output and report failures the same way. Each route file
 * is then one line: which kind of file in, which format out.
 */

const AI_SERVICE = process.env.AI_SERVICE_URL || "http://localhost:8001";

async function translatePagesLines(pages: RenderedPage[], targetLanguage: string): Promise<RenderedPage[]> {
    const allLines: string[] = [];
    const lineMap: { pageIdx: number; lineIdx: number }[] = [];

    pages.forEach((page, pageIdx) => {
        (page.lines ?? []).forEach((line, lineIdx) => {
            allLines.push(line.text);
            lineMap.push({ pageIdx, lineIdx });
        });
    });

    if (allLines.length === 0) {
        console.warn("No text lines found in PDF to translate.");
        return pages;
    }

    try {
        const response = await fetch(`${AI_SERVICE}/api/translate/lines`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                language: targetLanguage,
                lines: allLines,
            }),
            signal: AbortSignal.timeout(90000),
        });

        if (!response.ok) {
            console.error("AI service translation returned error status:", response.status);
            return pages;
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.translatedLines) && data.translatedLines.length > 0) {
            const updatedPages = pages.map((page) => ({
                ...page,
                lines: page.lines ? page.lines.map((l) => ({ ...l })) : undefined,
            }));

            data.translatedLines.forEach((translatedText: string, i: number) => {
                const mapItem = lineMap[i];
                if (mapItem && typeof translatedText === "string") {
                    const targetPage = updatedPages[mapItem.pageIdx];
                    const targetLine = targetPage?.lines?.[mapItem.lineIdx];
                    if (targetLine) {
                        targetLine.text = translatedText;
                    }
                }
            });

            return updatedPages;
        }
    } catch (err) {
        console.error("Failed to translate pages lines:", err);
    }

    return pages;
}

function baseName(file: File): string {
    return file.name.replace(/\.[^/.]+$/, "") || "document";
}

async function readUpload(req: NextRequest, kind: AcceptKind): Promise<{ file: File; targetLanguage?: string } | NextResponse> {
    const formData = await readFormData(req);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const rejected = rejectBadUpload(file, kind);
    if (rejected) return rejected;

    const rawLang = (formData?.get("targetLanguage") || formData?.get("language")) as string | null;
    const targetLanguage =
        rawLang && rawLang.trim() && !rawLang.toLowerCase().includes("original")
            ? rawLang.trim()
            : undefined;

    return { file, targetLanguage };
}

/** Word / Excel / PowerPoint in, PDF out — rendered by LibreOffice. */
export async function officeToPdfRoute(req: NextRequest, kind: AcceptKind): Promise<Response> {
    const upload = await readUpload(req, kind);
    if (upload instanceof NextResponse) return upload;
    const { file } = upload;

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

/**
 * Pages for Word and PowerPoint: the artwork rendered without its text, with
 * each line of text attached so it can be laid on top as an editable box.
 *
 * Anything that goes wrong separating the two — an unusual content stream, a
 * font pdf.js cannot read — falls back to the page rendered whole: still an
 * exact copy, just not editable, rather than no file at all.
 */
async function editablePages(bytes: Uint8Array, targetLanguage?: string): Promise<RenderedPage[]> {
    try {
        const [artwork, layout] = await Promise.all([
            stripPdfText(bytes.slice()).then((stripped) => renderPdfPages(stripped)),
            readTextLayout(bytes.slice()),
        ]);
        if (artwork.length !== layout.length) throw new Error("page count mismatch");
        let pages: RenderedPage[] = artwork.map((page, i) => ({ ...page, lines: layout[i].lines }));

        if (targetLanguage) {
            pages = await translatePagesLines(pages, targetLanguage);
        }

        return pages;
    } catch (error) {
        console.warn("Editable conversion fell back to page images:", error);
        return renderPdfPages(bytes.slice());
    }
}

/** PDF in, Word / PowerPoint / Excel out — each page placed as it looks in the PDF. */
export async function pdfToOfficeRoute(
    req: NextRequest,
    format: keyof typeof OUTPUT
): Promise<Response> {
    const upload = await readUpload(req, "pdf");
    if (upload instanceof NextResponse) return upload;
    const { file, targetLanguage } = upload;

    const bytes = new Uint8Array(await file.arrayBuffer());

    let output: Uint8Array;
    try {
        if (format === "xlsx") {
            const [rows, graphics, layout] = await Promise.all([
                extractPageCells(bytes.slice()),
                extractPageGraphics(bytes.slice()),
                // Only used to copy fonts / bold / colour; the sheet works without it.
                readTextLayout(bytes.slice()).catch(() => null),
            ]);
            if (graphics.length === 0) throw new Error("The PDF has no pages.");
            if (rows.length !== graphics.length) {
                throw new Error("The PDF text and page counts do not match.");
            }
            output = await pagesToXlsx(
                graphics.map((g, i) => ({
                    widthPt: g.widthPt,
                    heightPt: g.heightPt,
                    rows: rows[i],
                    hlines: g.hlines,
                    vlines: g.vlines,
                    lines: layout?.[i]?.lines,
                }))
            );
        } else {
            const pages = await editablePages(bytes, targetLanguage);
            if (pages.length === 0) throw new Error("The PDF has no pages.");
            output = format === "docx" ? await pagesToDocx(pages) : await pagesToPptx(pages, baseName(file));
        }
    } catch (error) {
        console.error(`PDF to ${format} failed:`, error);
        return NextResponse.json(
            { error: "Could not read that PDF. It may be damaged or password-protected." },
            { status: 400 }
        );
    }

    const langSuffix = targetLanguage ? `_${targetLanguage.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : "";

    return new NextResponse(Buffer.from(output), {
        headers: {
            "Content-Type": OUTPUT[format],
            "Content-Disposition": contentDisposition(`${baseName(file)}${langSuffix}.${format}`),
        },
    });
}
