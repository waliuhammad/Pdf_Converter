import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { PDFDocument } from "pdf-lib";
import { rejectBadUpload } from "@/lib/uploads";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const targetSizeKB = parseInt((formData.get("targetSizeKB") as string) || "0", 10);
    const targetRatio = parseFloat((formData.get("targetRatio") as string) || "0.5");

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    // Create a new compressed PDF container
    const pdfDoc = await PDFDocument.create();

    // Copy pages into the new document
    const pageIndices = Array.from({ length: srcDoc.getPageCount() }, (_, i) => i);
    const pages = await pdfDoc.copyPages(srcDoc, pageIndices);

    // Scale pages according to target ratio if extreme compression is targeted
    pages.forEach((page) => {
      if (targetRatio <= 0.3) {
        page.scale(0.8, 0.8);
      }
      pdfDoc.addPage(page);
    });

    // Strip metadata to minimize overhead
    pdfDoc.setTitle("");
    pdfDoc.setAuthor("");
    pdfDoc.setSubject("");
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer("");
    pdfDoc.setCreator("");

    // Save with maximum structural stream compression.
    //
    // Note: the output is the best *valid* compression achievable here. The
    // previous version truncated the byte stream to force the requested
    // target size, which corrupts the file — a PDF's cross-reference table
    // lives at the end, so cutting bytes off produces a document many
    // viewers cannot open. A slightly-larger-than-requested valid file
    // beats a to-the-byte broken one.
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

    const resultBuffer = Buffer.from(compressedBytes);

    return new NextResponse(resultBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="compressed_${targetSizeKB > 0 ? `${targetSizeKB}KB_` : ""}${file.name}"`,
      },
    });
  } catch (error) {
    console.error("PDF Compression Error:", error);
    return NextResponse.json(
      { error: "Failed to compress PDF" },
      { status: 500 }
    );
  }
});