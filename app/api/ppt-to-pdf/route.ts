import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
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

    if (!file) {
      return NextResponse.json(
        { error: "No PowerPoint file uploaded." },
        { status: 400 }
      );
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "powerpoint");
    if (badUpload) return badUpload;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }

    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();
    const xmlParser = new XMLParser({ ignoreAttributes: false });

    const slideParagraphs: { slideNum: number; paragraphText: string }[] = [];

    const slideEntries = zipEntries
      .filter((entry) => entry.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = parseInt(a.entryName.replace(/\D/g, "")) || 0;
        const numB = parseInt(b.entryName.replace(/\D/g, "")) || 0;
        return numA - numB;
      });

    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i];
      const xmlData = entry.getData().toString("utf8");
      const parsed = xmlParser.parse(xmlData);

      const lines: string[] = [];

      // The parsed OOXML is an arbitrarily nested bag of objects, arrays and
      // strings, so unknown is the honest input type — the walk narrows as it
      // goes rather than asserting a shape the XML need not have.
      function extractTextNodes(node: unknown) {
        if (!node || typeof node !== "object") return;
        const record = node as Record<string, unknown>;
        for (const key of Object.keys(record)) {
          const value = record[key];
          if (key === "a:t") {
            if (typeof value === "string") {
              lines.push(value);
            } else if (value && typeof value === "object" && "#text" in value) {
              lines.push(String((value as { "#text": unknown })["#text"]));
            }
          } else {
            extractTextNodes(value);
          }
        }
      }

      extractTextNodes(parsed);

      const cleanedLines = lines
        .map((l) =>
          l
            .replace(/[^\x20-\x7E]/g, "")
            // Strip out PDF Page references or tracking remnants if they exist in text
            .replace(/PDF Page \d+(\s+\(Part \d+ of \d+\))?/gi, "")
            .trim()
        )
        .filter(Boolean);

      const paragraphText = cleanedLines.join(" ").trim();

      slideParagraphs.push({
        slideNum: i + 1,
        paragraphText: paragraphText || "(Empty Slide)",
      });
    }

    if (slideParagraphs.length === 0) {
      slideParagraphs.push({
        slideNum: 1,
        paragraphText: "No readable text blocks could be extracted.",
      });
    }

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const wrapTextToLines = (text: string, maxCharsPerLine: number = 80): string[] => {
      const words = text.split(" ");
      const wrappedLines: string[] = [];
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + word).length > maxCharsPerLine) {
          if (currentLine) wrappedLines.push(currentLine.trim());
          currentLine = word + " ";
        } else {
          currentLine += word + " ";
        }
      }
      if (currentLine) {
        wrappedLines.push(currentLine.trim());
      }
      return wrappedLines;
    };

    let page = pdfDoc.addPage([600, 800]);
    let { height } = page.getSize();
    let currentY = height - 50;

    // Document Header
    page.drawText(`${file.name.replace(/\.[^/.]+$/, "")}`, {
      x: 50,
      y: currentY,
      size: 15,
      font: fontBold,
      color: rgb(0.08, 0.15, 0.3),
    });
    currentY -= 10;

    page.drawLine({
      start: { x: 50, y: currentY },
      end: { x: 550, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.84, 0.9),
    });
    currentY -= 30;

    // Render every slide with its Slide Number heading and continuous paragraph text
    for (const slide of slideParagraphs) {
      const wrappedParagraphLines = wrapTextToLines(slide.paragraphText, 78);
      const estimatedBlockHeight = 20 + wrappedParagraphLines.length * 14 + 16;

      if (currentY - estimatedBlockHeight < 50) {
        page = pdfDoc.addPage([600, 800]);
        height = page.getSize().height;
        currentY = height - 50;
      }

      // Slide X Heading
      page.drawText(`Slide ${slide.slideNum}:`, {
        x: 50,
        y: currentY,
        size: 11,
        font: fontBold,
        color: rgb(0.15, 0.3, 0.5),
      });
      currentY -= 16;

      // Paragraph lines
      for (const line of wrappedParagraphLines) {
        page.drawText(line, {
          x: 50,
          y: currentY,
          size: 10,
          font: fontRegular,
          color: rgb(0.2, 0.25, 0.35),
        });
        currentY -= 14;
      }

      // Space between slide blocks
      currentY -= 16;
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}-converted.pdf`),
      },
    });
  } catch (err) {
    console.error("PPT to PDF Error:", err);
    return NextResponse.json(
      { error: "Failed to process presentation content." },
      { status: 500 }
    );
  }
});