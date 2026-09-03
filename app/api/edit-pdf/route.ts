import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

interface TextAnnotation {
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  pageIndex: number;
}

interface DrawAnnotation {
  type: "draw";
  path: { x: number; y: number }[];
  color?: string;
  strokeWidth?: number;
  pageIndex: number;
}

interface ReplaceAnnotation {
  type: "replace";
  x: number;
  y: number;
  width: number;
  height: number;
  newText: string;
  fontSize: number;
  isBold?: boolean;
  isItalic?: boolean;
  color?: string;
  pageIndex: number;
}

type Annotation = TextAnnotation | DrawAnnotation | ReplaceAnnotation;

function hexToRgb(hex?: string) {
  if (!hex || !hex.startsWith("#")) return rgb(0, 0, 0);
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
  return rgb(r, g, b);
}

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const annotationsRaw = formData.get("annotations") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const annotations: Annotation[] = annotationsRaw ? JSON.parse(annotationsRaw) : [];
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fontBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);

    const pages = pdfDoc.getPages();

    annotations.forEach((ann) => {
      if (ann.pageIndex < 0 || ann.pageIndex >= pages.length) return;
      const page = pages[ann.pageIndex];
      const { height } = page.getSize();

      if (ann.type === "text") {
        let font = fontRegular;
        if (ann.isBold && ann.isItalic) font = fontBoldItalic;
        else if (ann.isBold) font = fontBold;
        else if (ann.isItalic) font = fontItalic;

        page.drawText(ann.text, {
          x: ann.x,
          y: height - ann.y,
          size: ann.fontSize || 16,
          font,
          color: hexToRgb(ann.color),
        });
      } else if (ann.type === "replace") {
        // Step 1: Whiteout / Redact existing text area
        page.drawRectangle({
          x: ann.x,
          y: height - ann.y - ann.height + 4,
          width: ann.width,
          height: ann.height,
          color: rgb(1, 1, 1), // White cover box
        });

        // Step 2: Write new replacement text over it
        let font = fontRegular;
        if (ann.isBold && ann.isItalic) font = fontBoldItalic;
        else if (ann.isBold) font = fontBold;
        else if (ann.isItalic) font = fontItalic;

        page.drawText(ann.newText, {
          x: ann.x,
          y: height - ann.y - (ann.fontSize * 0.8),
          size: ann.fontSize || 14,
          font,
          color: hexToRgb(ann.color),
        });
      } else if (ann.type === "draw" && ann.path && ann.path.length > 1) {
        const color = hexToRgb(ann.color);
        const thickness = ann.strokeWidth || 2;

        for (let i = 0; i < ann.path.length - 1; i++) {
          const p1 = ann.path[i];
          const p2 = ann.path[i + 1];
          page.drawLine({
            start: { x: p1.x, y: height - p1.y },
            end: { x: p2.x, y: height - p2.y },
            thickness,
            color,
          });
        }
      }
    });

    const modifiedPdfBytes = await pdfDoc.save({ useObjectStreams: true });

    return new NextResponse(Buffer.from(modifiedPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`edited_${file.name}`),
      },
    });
  } catch (error) {
    console.error("Edit PDF Error:", error);
    return NextResponse.json(
      { error: "Failed to edit PDF" },
      { status: 500 }
    );
  }
});