import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";
import {
  POSITIONS,
  ROTATIONS,
  WatermarkInputError,
  applyWatermark,
  type FontFamily,
  type Position,
  type WatermarkOptions,
} from "@/lib/watermark";

const FONTS: FontFamily[] = ["helvetica", "times", "courier"];
const MAX_WATERMARK_IMAGE_BYTES = 5 * 1024 * 1024;

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function numberField(formData: FormData, name: string, fallback: number): number {
  const parsed = parseFloat(field(formData, name));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Watermark a PDF.
 *
 * Form fields:
 *   file                 the PDF
 *   type                 "text" | "image"
 *   position             one of the nine grid cells (top-left ... bottom-right)
 *   mosaic               "true" to tile the watermark across the page
 *   opacity              0-1
 *   rotation             0 | 45 | 90 | 180 | 270
 *   layer                "over" | "below"
 *   fromPage, toPage     1-based, inclusive (default: every page)
 *   text options         text, font (helvetica|times|courier), fontSize,
 *                        bold, italic, underline, textColor, bgColor ("" = none)
 *   image options        image (PNG/JPG), imageScale (fraction of page width)
 */
export const POST = metered(async (req: NextRequest) => {
  try {
    const formData = await readFormData(req);
    if (!formData) return bad("No file provided.");

    const file = formData.get("file");
    if (!(file instanceof File)) return bad("No PDF file uploaded.");

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const type = field(formData, "type");
    if (type !== "text" && type !== "image") {
      return bad('Choose a watermark type: "text" or "image".');
    }

    const positionRaw = field(formData, "position") as Position;
    const rotation = numberField(formData, "rotation", 0);

    const common = {
      position: POSITIONS.includes(positionRaw) ? positionRaw : ("center" as Position),
      mosaic: field(formData, "mosaic") === "true",
      opacity: Math.min(1, Math.max(0, numberField(formData, "opacity", 0.5))),
      rotation: (ROTATIONS as readonly number[]).includes(rotation) ? rotation : 0,
      layer: field(formData, "layer") === "below" ? ("below" as const) : ("over" as const),
      fromPage: numberField(formData, "fromPage", 1),
      toPage: numberField(formData, "toPage", Number.MAX_SAFE_INTEGER),
    };

    let options: WatermarkOptions;

    if (type === "text") {
      const text = field(formData, "text").trim();
      if (!text) return bad("Enter the watermark text.");
      if (text.length > 200) return bad("The watermark text is too long (200 characters at most).");

      const font = field(formData, "font") as FontFamily;
      const background = field(formData, "bgColor");

      options = {
        ...common,
        type: "text",
        text,
        font: FONTS.includes(font) ? font : "helvetica",
        fontSize: Math.min(200, Math.max(6, numberField(formData, "fontSize", 48))),
        bold: field(formData, "bold") === "true",
        italic: field(formData, "italic") === "true",
        underline: field(formData, "underline") === "true",
        color: field(formData, "textColor") || "#000000",
        background: background || null,
      };
    } else {
      const image = formData.get("image");
      if (!(image instanceof File) || image.size === 0) return bad("Choose an image for the watermark.");
      if (image.size > MAX_WATERMARK_IMAGE_BYTES) return bad("The watermark image must be 5 MB or smaller.");

      const bytes = new Uint8Array(await image.arrayBuffer());
      // By content, not by the declared type: browsers label files loosely.
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
      if (!isPng && !isJpg) return bad("Unsupported image format. Use a PNG or JPG.");

      options = {
        ...common,
        type: "image",
        image: bytes,
        imageKind: isPng ? "png" : "jpg",
        scale: Math.min(1, Math.max(0.05, numberField(formData, "imageScale", 0.3))),
      };
    }

    let result: Uint8Array;
    try {
      result = await applyWatermark(new Uint8Array(await file.arrayBuffer()), options);
    } catch (error) {
      if (error instanceof WatermarkInputError) return bad(error.message);
      if (error instanceof Error && /encrypt/i.test(error.message)) {
        return bad("This PDF is password-protected. Unlock it first, then add the watermark.");
      }
      throw error;
    }

    return new NextResponse(new Uint8Array(result), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`),
      },
    });
  } catch (error) {
    console.error("Watermark generation error:", error);
    return bad("Failed to apply watermark to PDF.", 500);
  }
});
