import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { extractPageLines } from "@/lib/pdf-text";
import pptxgen from "pptxgenjs";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

// renders every page into a slide,
// so the platform default is not enough.
export const maxDuration = 60;

export const POST = metered(async (req: NextRequest) => {
  try {
    const formData = await readFormData(req);
        if (!formData) {
            return NextResponse.json({ error: "No file provided." }, { status: 400 });
        }
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file uploaded." },
        { status: 400 }
      );
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const buffer = Buffer.from(await file.arrayBuffer());

    // Step 1: Read the text of every page.
    //
    // This used pdf2json, which fails on every PDF in this install with
    // "Invalid XRef stream header" - including one pdf-lib had just produced -
    // so the tool errored on all input. The shared pdf.js extractor is the one
    // pdf-to-word already relies on.
    const rawPages = await extractPageLines(new Uint8Array(buffer));

    // A line that begins with a replacement character or a bare question mark
    // is a bullet glyph the font could not map; show it as one.
    const BULLET_ARTEFACT = /^(?:\?|�|\[\?\])\s*/;

    const pageWiseTexts: string[][] = rawPages.map((pageLines) => {
      const fixed = pageLines.map((line) =>
        BULLET_ARTEFACT.test(line) ? line.replace(BULLET_ARTEFACT, "■ ") : line
      );

      return fixed.length > 0 ? fixed : ["Empty Page Content"];
    });

    if (pageWiseTexts.length === 0) {
      pageWiseTexts.push(["No content extracted from PDF"]);
    }

    // Step 2: Generate PowerPoint presentation with min 2 and max 5 slides per PDF page
    const pptx = new pptxgen();

    pptx.author = "PDF AI Suite";
    pptx.company = "Document Conversion Suite";
    pptx.title = file.name.replace(/\.[^/.]+$/, "");

    for (let pageIdx = 0; pageIdx < pageWiseTexts.length; pageIdx++) {
      const pageLines = pageWiseTexts[pageIdx];

      // Enforce: Min 2 slides, Max 5 slides per PDF page
      let targetChunksCount = 2;
      if (pageLines.length > 0) {
        targetChunksCount = Math.min(5, Math.max(2, Math.ceil(pageLines.length / 5)));
      }

      const chunkSize = Math.ceil(pageLines.length / targetChunksCount);
      const chunks: string[][] = [];
      for (let i = 0; i < pageLines.length; i += chunkSize) {
        chunks.push(pageLines.slice(i, i + chunkSize));
      }
      
      if (chunks.length === 0) {
        chunks.push(pageLines);
      }
      while (chunks.length < 2) {
        chunks.push([]); // Guarantee at least 2 slides per page
      }

      for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
        const slide = pptx.addSlide();
        const chunk = chunks[chunkIdx];

        const slideTitle = `PDF Page ${pageIdx + 1} (Part ${chunkIdx + 1} of ${chunks.length})`;

        // Slide Header
        slide.addText(slideTitle, {
          x: 0.8,
          y: 0.4,
          w: "90%",
          h: 0.5,
          fontSize: 18,
          bold: true,
          color: "1E293B",
        });

        // Format chunk lines cleanly while preserving exact original spacing behavior
        const processedChunkText = chunk.length > 0 
          ? chunk.map(line => {
              if (/^(\?\s*|\uFFFD\s*|\[\?\]\s*)/.test(line)) {
                return line.replace(/^(\?\s*|\uFFFD\s*|\[\?\]\s*)+/, "■ ");
              }
              return line;
            }).join("\n\n") 
          : "---";

        // Main content text box preserving exact original spacing behavior
        slide.addText(processedChunkText, {
          x: 0.8,
          y: 1.1,
          w: "85%",
          h: 5.8,
          fontSize: 13,
          color: "334155",
          valign: "top",
          lineSpacing: 14,
        });
      }
    }

    const pptxBuffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const uint8Array = new Uint8Array(pptxBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}-converted.pptx`),
      },
    });
  } catch (err) {
    console.error("PDF to PPT Error:", err);
    return NextResponse.json(
      { error: "Failed to convert PDF to PowerPoint." },
      { status: 500 }
    );
  }
});