import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { PDFDocument } from "pdf-lib";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const splitMode = formData.get("splitMode") as string;
    const fromPage = parseInt((formData.get("fromPage") as string) || "1", 10);
    const toPage = parseInt((formData.get("toPage") as string) || "1", 10);
    const everyN = parseInt((formData.get("everyN") as string) || "1", 10);
    const downloadChoice = formData.get("downloadChoice") as string;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = srcDoc.getPageCount();
    const newDoc = await PDFDocument.create();

    const targetIndices: number[] = [];

    if (splitMode === "range") {
      const start = Math.max(0, fromPage - 1);
      const end = Math.min(totalPages - 1, toPage - 1);

      if (downloadChoice === "remaining") {
        for (let i = 0; i < totalPages; i++) {
          if (i < start || i > end) {
            targetIndices.push(i);
          }
        }
      } else {
        // Default to split / extracted segment
        for (let i = start; i <= end; i++) {
          targetIndices.push(i);
        }
      }
    } else if (splitMode === "every") {
      const chunkSize = Math.max(1, everyN);
      const end = Math.min(totalPages, chunkSize);
      for (let i = 0; i < end; i++) {
        targetIndices.push(i);
      }
    }

    if (targetIndices.length === 0) {
      return NextResponse.json(
        { error: "No pages left to extract. Select a smaller range." },
        { status: 400 }
      );
    }

    const copiedPages = await newDoc.copyPages(srcDoc, targetIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const pdfBytes = await newDoc.save();

    const filename = downloadChoice === "remaining" ? "remaining-pages.pdf" : "split-document.pdf";

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${filename}`),
      },
    });
  } catch (error) {
    console.error("PDF Split Error:", error);
    return NextResponse.json({ error: "Failed to split PDF" }, { status: 500 });
  }
});