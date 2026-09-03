import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
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
    const signMode = formData.get("signMode") as string;
    const signatureText = formData.get("signatureText") as string | null;
    const signatureImage = formData.get("signatureImage") as string | null;
    const targetPageNum = parseInt(formData.get("pageNumber") as string) || 1;
    const position = formData.get("position") as string || "right";
    const signScope = formData.get("signScope") as string || "specific"; // "specific" or "all"

    if (!file) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfDoc = await PDFDocument.load(buffer);

    // The typed signature is drawn by us, so the face has to be one of the
    // fonts every PDF reader already has. Oblique stands in for a handwritten
    // look without shipping a font file.
    const FONT_CHOICES: Record<string, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
      helvetica: StandardFonts.Helvetica,
      "helvetica-oblique": StandardFonts.HelveticaOblique,
      "helvetica-bold": StandardFonts.HelveticaBold,
      times: StandardFonts.TimesRoman,
      "times-italic": StandardFonts.TimesRomanItalic,
      "times-bold": StandardFonts.TimesRomanBold,
      courier: StandardFonts.Courier,
      "courier-oblique": StandardFonts.CourierOblique,
    };

    const requestedFont = (formData.get("fontFamily") as string) || "helvetica-oblique";
    const font = await pdfDoc.embedFont(
      FONT_CHOICES[requestedFont] ?? StandardFonts.HelveticaOblique
    );

    /** "#0f172a" to pdf-lib's 0-1 triple; black for anything unparseable. */
    const hexToRgb = (hex?: string | null) => {
      if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return rgb(0, 0, 0);
      const clean = hex.slice(1);
      return rgb(
        parseInt(clean.slice(0, 2), 16) / 255,
        parseInt(clean.slice(2, 4), 16) / 255,
        parseInt(clean.slice(4, 6), 16) / 255
      );
    };

    // The colour was hardcoded here, so whichever colour was picked in the UI
    // was shown in the preview and then thrown away on the way to the PDF.
    const signatureColor = hexToRgb(formData.get("penColor") as string | null);

    const pages = pdfDoc.getPages();
    const signY = 40;
    const margin = 50;

    let embeddedImage = null;
    if (signMode === "draw" && signatureImage) {
      const base64Data = signatureImage.replace(/^data:image\/png;base64,/, "");
      const imageBytes = Buffer.from(base64Data, "base64");
      embeddedImage = await pdfDoc.embedPng(imageBytes);
    }

    const text = signatureText ? signatureText.substring(0, 35) : "Authorized Signature";

    // Clamped: the field is a number input, and a hand-edited value large
    // enough to run off the page should not reach drawText.
    const requestedSize = Number(formData.get("fontSize"));
    const fontSize =
      Number.isFinite(requestedSize) && requestedSize >= 8 && requestedSize <= 48
        ? requestedSize
        : 14;
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const imgWidth = 150;
    const imgHeight = 50;

    const pagesToSign = signScope === "all" ? pages : [pages[Math.max(0, Math.min(targetPageNum - 1, pages.length - 1))]];

    for (const targetPage of pagesToSign) {
      const { width } = targetPage.getSize();
      let signX = margin;

      if (signMode === "draw" && embeddedImage) {
        if (position === "center") {
          signX = (width - imgWidth) / 2;
        } else if (position === "right") {
          signX = width - imgWidth - margin;
        }

        targetPage.drawImage(embeddedImage, {
          x: signX,
          y: signY,
          width: imgWidth,
          height: imgHeight,
        });
      } else {
        if (position === "center") {
          signX = (width - textWidth) / 2;
        } else if (position === "right") {
          signX = width - textWidth - margin;
        }

        targetPage.drawText(text, {
          x: signX,
          y: signY + 15,
          size: fontSize,
          font,
          color: signatureColor,
        });
      }
    }

    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}-signed.pdf`),
      },
    });
  } catch (err) {
    console.error("PDF Signing Error:", err);
    return NextResponse.json({ error: "Failed to sign document." }, { status: 500 });
  }
});