import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File;
    const watermarkType = formData.get("type") as "text" | "image";

    if (!file) {
      return NextResponse.json({ error: "No PDF file uploaded" }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    // The work happens inside `if (type === "text")` / `else if (type ===
    // "image")`. With neither, both branches were skipped and the file came
    // back saved but unwatermarked — a 200 and an unchanged PDF, which reads
    // as success.
    if (watermarkType !== "text" && watermarkType !== "image") {
      return NextResponse.json(
        { error: 'Choose a watermark type: "text" or "image".' },
        { status: 400 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pages = pdfDoc.getPages();

    const opacity = parseFloat((formData.get("opacity") as string) || "0.3");
    const rotationDeg = parseFloat((formData.get("rotation") as string) || "0");
    const position = ((formData.get("position") as string) || "center") as Position;

    const hexToRgb = (hex: string) => {
      const clean = hex.replace("#", "");
      const r = parseInt(clean.substring(0, 2), 16) / 255;
      const g = parseInt(clean.substring(2, 4), 16) / 255;
      const b = parseInt(clean.substring(4, 6), 16) / 255;
      return rgb(r, g, b);
    };

    // Calculate absolute X,Y coordinates based on 9 position grid
    const calculateCoordinates = (
      pageWidth: number,
      pageHeight: number,
      itemWidth: number,
      itemHeight: number,
      pos: Position,
      angleDeg: number
    ) => {
      const margin = 40;
      let targetCenterX = pageWidth / 2;
      let targetCenterY = pageHeight / 2;

      // Horizontal Alignment
      if (pos.includes("left")) {
        targetCenterX = margin + itemWidth / 2;
      } else if (pos.includes("right")) {
        targetCenterX = pageWidth - margin - itemWidth / 2;
      }

      // Vertical Alignment
      if (pos.includes("top")) {
        targetCenterY = pageHeight - margin - itemHeight / 2;
      } else if (pos.includes("bottom")) {
        targetCenterY = margin + itemHeight / 2;
      }

      const rad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Pivot offset for center rotation
      const offsetX = (itemWidth / 2) * cos - (itemHeight / 2) * sin;
      const offsetY = (itemWidth / 2) * sin + (itemHeight / 2) * cos;

      return {
        x: targetCenterX - offsetX,
        y: targetCenterY - offsetY,
      };
    };

    if (watermarkType === "text") {
      const text = (formData.get("text") as string) || "WATERMARK";
      const textColorHex = (formData.get("textColor") as string) || "#ef4444";
      const bgColorHex = (formData.get("bgColor") as string) || "";
      const fontSize = parseFloat((formData.get("fontSize") as string) || "48");
      const isTiled = formData.get("isTiled") === "true";

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const textColor = hexToRgb(textColorHex);
      const bgColor = bgColorHex ? hexToRgb(bgColorHex) : null;

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const textHeight = font.heightAtSize(fontSize);

        if (isTiled) {
          const stepX = textWidth + 80;
          const stepY = textHeight + 80;

          for (let x = 0; x < width + stepX; x += stepX) {
            for (let y = 0; y < height + stepY; y += stepY) {
              if (bgColor) {
                page.drawRectangle({
                  x: x - 5,
                  y: y - 5,
                  width: textWidth + 10,
                  height: textHeight + 10,
                  color: bgColor,
                  opacity: opacity * 0.8,
                  rotate: degrees(rotationDeg),
                });
              }
              page.drawText(text, {
                x,
                y,
                size: fontSize,
                font,
                color: textColor,
                opacity,
                rotate: degrees(rotationDeg),
              });
            }
          }
        } else {
          const { x, y } = calculateCoordinates(
            width,
            height,
            textWidth,
            textHeight,
            position,
            rotationDeg
          );

          if (bgColor) {
            page.drawRectangle({
              x: x - 8,
              y: y - 4,
              width: textWidth + 16,
              height: textHeight + 8,
              color: bgColor,
              opacity: opacity * 0.8,
              rotate: degrees(rotationDeg),
            });
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: textColor,
            opacity,
            rotate: degrees(rotationDeg),
          });
        }
      }
    } else if (watermarkType === "image") {
      const imageFile = formData.get("image") as File;
      if (!imageFile) {
        return NextResponse.json({ error: "No watermark image provided" }, { status: 400 });
      }

      const imgBuffer = await imageFile.arrayBuffer();
      let embeddedImage;

      if (imageFile.type === "image/png") {
        embeddedImage = await pdfDoc.embedPng(imgBuffer);
      } else if (imageFile.type === "image/jpeg" || imageFile.type === "image/jpg") {
        embeddedImage = await pdfDoc.embedJpg(imgBuffer);
      } else {
        return NextResponse.json({ error: "Unsupported image format. Use PNG or JPG." }, { status: 400 });
      }

      const scale = parseFloat((formData.get("imageScale") as string) || "0.3");
      const imgDims = embeddedImage.scale(scale);

      for (const page of pages) {
        const { width, height } = page.getSize();
        const { x, y } = calculateCoordinates(
          width,
          height,
          imgDims.width,
          imgDims.height,
          position,
          rotationDeg
        );

        page.drawImage(embeddedImage, {
          x,
          y,
          width: imgDims.width,
          height: imgDims.height,
          opacity,
          rotate: degrees(rotationDeg),
        });
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(modifiedPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`watermarked_${file.name}`),
      },
    });
  } catch (error) {
    console.error("Watermark generation error:", error);
    return NextResponse.json({ error: "Failed to apply watermark to PDF." }, { status: 500 });
  }
});