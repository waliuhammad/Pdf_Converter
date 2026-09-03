import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { pdfToPng } from "pdf-to-png-converter";
import type { PdfToPngOptions } from "pdf-to-png-converter";
import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

// renders every page to a bitmap,
// so the platform default is not enough.
export const maxDuration = 60;

export const POST = metered(async (req: NextRequest) => {
  try {
    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const action = formData.get("action");

    // Two actions share this route. "get-info" only reads the page count so
    // the UI can render its controls — signed-in users get that for free.
    // Only "convert", the actual work, counts against the daily allowance;
    // charging both would bill every conversion twice.
    if (action === "get-info") {
    } else {
    }

    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save temporary file safely in OS tmp dir
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-"));
    const tempFilePath = path.join(tempDir, file.name);
    fs.writeFileSync(tempFilePath, buffer);

    if (action === "get-info") {
      // Isolated: pdf-to-word runs a different pdf.js major in this same
      // process and the two share a worker global. See the helper.
      const pages = await withOwnPdfWorker(() =>
        pdfToPng(tempFilePath, { returnMetadataOnly: true })
      );

      fs.rmSync(tempDir, { recursive: true, force: true });
      return NextResponse.json({ numPages: pages.length });
    }

    if (action === "convert") {
      const mode = formData.get("mode");
      const pageNumberStr = formData.get("pageNumber") as string;

      const options: PdfToPngOptions = {
        outputFolder: tempDir,
        viewportScale: 2.0,
      };

      if (mode === "custom") {
        const pageNum = parseInt(pageNumberStr, 10);
        options.pagesToProcess = [pageNum];
      }

      const pngPages = await withOwnPdfWorker(() => pdfToPng(tempFilePath, options));

      if (mode === "custom" && pngPages.length > 0) {
        const singlePage = pngPages[0];
        if (singlePage.kind === "content" && singlePage.content) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return new NextResponse(singlePage.content as unknown as BodyInit, {
            headers: {
              "Content-Type": "image/png",
              "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}_page_${pageNumberStr}.png`),
            },
          });
        }
      }

      const zip = new AdmZip();
      pngPages.forEach((page) => {
        if (page.kind === "content" && page.content) {
          zip.addFile(page.name, page.content);
        } else if (page.kind === "file" && page.path) {
          zip.addLocalFile(page.path);
        }
      });

      const zipBuffer = zip.toBuffer();
      fs.rmSync(tempDir, { recursive: true, force: true });

      return new NextResponse(zipBuffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}_images.zip`),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("PDF conversion error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});