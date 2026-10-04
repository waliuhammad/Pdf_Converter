import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { PDFDocument } from "pdf-lib";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";
import {
  baseNameOf,
  extractImagesAsJpg,
  renderPagesToJpg,
  type JpgFile,
  type JpgQuality,
} from "@/lib/pdf-to-jpg";

// Renders every page to a bitmap, so the platform default is not enough.
export const maxDuration = 60;

/**
 * PDF to JPG.
 *
 * Form fields:
 *   file        the PDF
 *   mode        "pages" (each page becomes a JPG) or "extract" (the images
 *               embedded in the PDF)
 *   quality     "normal" (150 dpi) or "high" (300 dpi)
 *   pageNumber  optional: only this page
 *
 * One resulting image comes back as a .jpg, several as a .zip.
 */
export const POST = metered(async (req: NextRequest) => {
  try {
    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const mode = formData.get("mode") === "extract" ? "extract" : "pages";
    const quality: JpgQuality = formData.get("quality") === "high" ? "high" : "normal";

    const bytes = new Uint8Array(await file.arrayBuffer());

    let pageCount: number;
    try {
      const doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
      pageCount = doc.getPageCount();
    } catch {
      return NextResponse.json(
        { error: "Could not read this PDF. It may be damaged or password-protected." },
        { status: 400 }
      );
    }

    let pages: number[] | undefined;
    const pageField = formData.get("pageNumber");
    if (typeof pageField === "string" && pageField.trim() !== "") {
      const pageNumber = Number(pageField);
      if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > pageCount) {
        return NextResponse.json(
          { error: `Choose a page between 1 and ${pageCount}.` },
          { status: 400 }
        );
      }
      pages = [pageNumber];
    }

    const baseName = baseNameOf(file.name);
    let files: JpgFile[];

    if (mode === "extract") {
      const result = await extractImagesAsJpg(bytes, baseName, quality, pages);
      files = result.files;
      if (files.length === 0) {
        const error =
          result.skipped > 0
            ? "The images in this PDF use a format that cannot be extracted. Try \"Page to JPG\" instead."
            : "No images were found in this PDF. Try \"Page to JPG\" instead.";
        return NextResponse.json({ error }, { status: 422 });
      }
    } else {
      files = await renderPagesToJpg(bytes, baseName, quality, pages);
      if (files.length === 0) {
        return NextResponse.json({ error: "No pages could be rendered." }, { status: 422 });
      }
    }

    if (files.length === 1) {
      return new NextResponse(new Uint8Array(files[0].data), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": contentDisposition(files[0].name),
        },
      });
    }

    const zip = new AdmZip();
    for (const f of files) zip.addFile(f.name, f.data);

    return new NextResponse(new Uint8Array(zip.toBuffer()), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition(`${baseName}_jpg.zip`),
      },
    });
  } catch (err) {
    console.error("PDF to JPG error:", err);
    return NextResponse.json({ error: "Could not convert this PDF to JPG." }, { status: 500 });
  }
});
