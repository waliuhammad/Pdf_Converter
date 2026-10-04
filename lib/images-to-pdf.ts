/**
 * Lay images out as PDF pages: one image per page, centred, with the chosen
 * page size, orientation and margin.
 *
 * Runs in the browser (JPG to PDF converts there) and in Node for tests. pdf-lib
 * is passed in rather than imported so the page can keep loading it lazily.
 */
import type * as PdfLib from "pdf-lib";

export type PageSize = "fit" | "a4" | "letter";
export type Orientation = "portrait" | "landscape";
export type MarginSize = "none" | "small" | "big";

export interface LayoutOptions {
  pageSize: PageSize;
  /** Ignored for "fit", where the page takes the image's own shape. */
  orientation: Orientation;
  margin: MarginSize;
}

export interface PdfImageInput {
  /** JPEG or PNG bytes; anything else is converted before it gets here. */
  bytes: Uint8Array;
  kind: "jpg" | "png";
}

/** Portrait sizes in points. */
const PAGE_SIZES: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
};

export const MARGINS: Record<MarginSize, number> = {
  none: 0,
  small: 20,
  big: 40,
};

/** Image pixels to points: one CSS pixel (1/96 in) is 0.75 pt. */
const PX_TO_PT = 0.75;

/** Where an image of the given size goes on its page (all in points). */
export function layoutFor(
  imageWidthPx: number,
  imageHeightPx: number,
  options: LayoutOptions
): { pageWidth: number; pageHeight: number; x: number; y: number; width: number; height: number } {
  const margin = MARGINS[options.margin];

  if (options.pageSize === "fit") {
    const width = imageWidthPx * PX_TO_PT;
    const height = imageHeightPx * PX_TO_PT;
    return {
      pageWidth: width + margin * 2,
      pageHeight: height + margin * 2,
      x: margin,
      y: margin,
      width,
      height,
    };
  }

  const [w, h] = PAGE_SIZES[options.pageSize];
  const pageWidth = options.orientation === "landscape" ? h : w;
  const pageHeight = options.orientation === "landscape" ? w : h;
  const boxW = pageWidth - margin * 2;
  const boxH = pageHeight - margin * 2;
  // Scaled to fill the space inside the margins without distorting.
  const scale = Math.min(boxW / imageWidthPx, boxH / imageHeightPx);
  const width = imageWidthPx * scale;
  const height = imageHeightPx * scale;
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

/** Append one page holding `image` to `doc`. */
export async function addImagePage(
  doc: PdfLib.PDFDocument,
  image: PdfImageInput,
  options: LayoutOptions
): Promise<void> {
  const embedded = image.kind === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
  const box = layoutFor(embedded.width, embedded.height, options);
  const page = doc.addPage([box.pageWidth, box.pageHeight]);
  page.drawImage(embedded, { x: box.x, y: box.y, width: box.width, height: box.height });
}

/** One PDF holding every image, a page each, in order. */
export async function imagesToPdf(
  lib: typeof PdfLib,
  images: PdfImageInput[],
  options: LayoutOptions
): Promise<Uint8Array> {
  const doc = await lib.PDFDocument.create();
  for (const image of images) await addImagePage(doc, image, options);
  return doc.save();
}
