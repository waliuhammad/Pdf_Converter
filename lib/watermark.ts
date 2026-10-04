/**
 * Stamp a text or image watermark onto a PDF with pdf-lib.
 *
 * Kept free of any request handling so it can be called (and tested) directly;
 * app/api/watermark-pdf/route.ts only parses the form into WatermarkOptions.
 *
 * Coordinates: every placement is worked out in the page as it is *displayed*
 * - after its /Rotate and within its crop box - and then mapped back into the
 * page's own user space. Without that a "top left" stamp landed in some other
 * corner of a landscape scan stored as a rotated portrait page.
 */
import {
  PDFArray,
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFName,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
  type RGB,
} from "pdf-lib";

export const POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type Position = (typeof POSITIONS)[number];
export type FontFamily = "helvetica" | "times" | "courier";
export type Layer = "over" | "below";

/** The rotations offered, in degrees counter-clockwise as seen on the page. */
export const ROTATIONS = [0, 45, 90, 180, 270] as const;

interface CommonOptions {
  /** One of the nine grid cells, or tiled across the whole page. */
  position: Position;
  mosaic: boolean;
  /** 0 (invisible) to 1 (solid). */
  opacity: number;
  /** Degrees, counter-clockwise. */
  rotation: number;
  /** Over the page content, or underneath it. */
  layer: Layer;
  /** 1-based, inclusive. Clamped to the document. */
  fromPage: number;
  toPage: number;
}

export interface TextWatermark extends CommonOptions {
  type: "text";
  text: string;
  font: FontFamily;
  /** Points. */
  fontSize: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  /** #rrggbb */
  color: string;
  /** #rrggbb, or null for none. */
  background: string | null;
}

export interface ImageWatermark extends CommonOptions {
  type: "image";
  image: Uint8Array;
  imageKind: "png" | "jpg";
  /** Width as a fraction of the page width (0.05-1). */
  scale: number;
}

export type WatermarkOptions = TextWatermark | ImageWatermark;

/** Raised for input the standard fonts cannot draw, so the route can answer 400. */
export class WatermarkInputError extends Error {}

const MARGIN = 36;

const FONT_TABLE: Record<FontFamily, [StandardFonts, StandardFonts, StandardFonts, StandardFonts]> = {
  // regular, bold, italic, bold italic
  helvetica: [
    StandardFonts.Helvetica,
    StandardFonts.HelveticaBold,
    StandardFonts.HelveticaOblique,
    StandardFonts.HelveticaBoldOblique,
  ],
  times: [
    StandardFonts.TimesRoman,
    StandardFonts.TimesRomanBold,
    StandardFonts.TimesRomanItalic,
    StandardFonts.TimesRomanBoldItalic,
  ],
  courier: [
    StandardFonts.Courier,
    StandardFonts.CourierBold,
    StandardFonts.CourierOblique,
    StandardFonts.CourierBoldOblique,
  ],
};

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return rgb(0, 0, 0);
  return rgb(
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255
  );
}

/** How the page is displayed: its visible size and the map from display to user space. */
interface PageFrame {
  width: number;
  height: number;
  /** Clockwise /Rotate of the page, normalised to 0/90/180/270. */
  pageRotation: number;
  toUser: (x: number, y: number) => { x: number; y: number };
}

function frameOf(page: PDFPage): PageFrame {
  const box = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const W = box.width;
  const H = box.height;
  const ox = box.x;
  const oy = box.y;

  switch (r) {
    case 90:
      return { width: H, height: W, pageRotation: 90, toUser: (x, y) => ({ x: ox + W - y, y: oy + x }) };
    case 180:
      return { width: W, height: H, pageRotation: 180, toUser: (x, y) => ({ x: ox + W - x, y: oy + H - y }) };
    case 270:
      return { width: H, height: W, pageRotation: 270, toUser: (x, y) => ({ x: ox + y, y: oy + H - x }) };
    default:
      return { width: W, height: H, pageRotation: 0, toUser: (x, y) => ({ x: ox + x, y: oy + y }) };
  }
}

/** Width and height of a w x h box once turned by `deg`. */
function rotatedBounds(w: number, h: number, deg: number): { w: number; h: number } {
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { w: w * c + h * s, h: w * s + h * c };
}

/** Centres (in display space) for one placement or a mosaic. */
function centresFor(
  frame: PageFrame,
  bounds: { w: number; h: number },
  position: Position,
  mosaic: boolean
): { x: number; y: number }[] {
  if (mosaic) {
    const gapX = 24 + bounds.w * 0.15;
    const gapY = 24 + bounds.h * 0.3;
    const stepX = bounds.w + gapX;
    const stepY = bounds.h + gapY;
    const cols = Math.ceil(frame.width / stepX) + 1;
    const rows = Math.ceil(frame.height / stepY) + 1;
    // Centre the grid on the page so the pattern is symmetrical.
    const startX = frame.width / 2 - Math.floor(cols / 2) * stepX;
    const startY = frame.height / 2 - Math.floor(rows / 2) * stepY;
    const out: { x: number; y: number }[] = [];
    for (let row = 0; row <= rows; row++) {
      // Alternate rows are shifted half a step, brick-fashion.
      const shift = row % 2 === 1 ? stepX / 2 : 0;
      for (let col = -1; col <= cols; col++) {
        const x = startX + col * stepX + shift;
        const y = startY + row * stepY;
        if (x + bounds.w / 2 < 0 || x - bounds.w / 2 > frame.width) continue;
        if (y + bounds.h / 2 < 0 || y - bounds.h / 2 > frame.height) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  let x = frame.width / 2;
  let y = frame.height / 2;
  if (position.endsWith("left")) x = MARGIN + bounds.w / 2;
  else if (position.endsWith("right")) x = frame.width - MARGIN - bounds.w / 2;
  if (position.startsWith("top")) y = frame.height - MARGIN - bounds.h / 2;
  else if (position.startsWith("bottom")) y = MARGIN + bounds.h / 2;
  return [{ x, y }];
}

/**
 * Turn a centre in display space into the drawing origin pdf-lib wants.
 *
 * pdf-lib rotates about the origin it is given (bottom-left of the item), so
 * the origin is the centre minus the half-size vector turned by the same angle.
 */
function originFor(
  frame: PageFrame,
  centre: { x: number; y: number },
  w: number,
  h: number,
  displayRotation: number
): { x: number; y: number; angle: number } {
  const rad = (displayRotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const ox = centre.x - ((w / 2) * cos - (h / 2) * sin);
  const oy = centre.y - ((w / 2) * sin + (h / 2) * cos);
  const user = frame.toUser(ox, oy);
  // A page shown turned clockwise by r needs the stamp turned
  // counter-clockwise by r in its own space to look upright.
  return { ...user, angle: displayRotation + frame.pageRotation };
}

/** Offset a user-space point along the stamp's own axes. */
function along(origin: { x: number; y: number }, angle: number, dx: number, dy: number) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

/**
 * Move what was just drawn to the start of the page's content, so the original
 * page paints over it.
 *
 * pdf-lib appends one new content stream per page for everything drawn on it,
 * and always as the last entry of /Contents (the original content is wrapped in
 * q/Q first, so it still starts from a clean graphics state). Moving that last
 * entry to the front is therefore all "below the content" takes.
 */
function sendToBack(page: PDFPage): void {
  const contents = page.node.lookup(PDFName.of("Contents"));
  if (!(contents instanceof PDFArray) || contents.size() < 2) return;
  const ours = contents.get(contents.size() - 1);
  contents.remove(contents.size() - 1);
  contents.insert(0, ours);
}

export async function applyWatermark(pdf: Uint8Array, options: WatermarkOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf);
  const pages = doc.getPages();
  if (pages.length === 0) return doc.save();

  const from = Math.min(Math.max(1, Math.floor(options.fromPage) || 1), pages.length);
  const to = Math.min(Math.max(from, Math.floor(options.toPage) || pages.length), pages.length);
  const opacity = Math.min(1, Math.max(0, options.opacity));
  const rotation = ((options.rotation % 360) + 360) % 360;

  let font: PDFFont | null = null;
  let image: PDFImage | null = null;

  if (options.type === "text") {
    const variant = (options.bold ? 1 : 0) + (options.italic ? 2 : 0);
    font = await doc.embedFont(FONT_TABLE[options.font][variant]);
    try {
      font.encodeText(options.text);
    } catch {
      throw new WatermarkInputError(
        "The watermark text contains characters the built-in fonts cannot draw. Use Latin letters, digits and common symbols."
      );
    }
  } else {
    image = options.imageKind === "png" ? await doc.embedPng(options.image) : await doc.embedJpg(options.image);
  }

  for (let index = from - 1; index < to; index++) {
    const page = pages[index];
    const frame = frameOf(page);

    if (options.type === "text" && font) {
      const size = Math.max(4, options.fontSize);
      const textWidth = font.widthOfTextAtSize(options.text, size);
      const ascent = font.heightAtSize(size, { descender: false });
      const descent = font.heightAtSize(size) - ascent;
      const color = hexToRgb(options.color);
      const background = options.background ? hexToRgb(options.background) : null;
      const pad = size * 0.25;
      const bounds = rotatedBounds(textWidth + pad * 2, ascent + descent + pad * 2, rotation);

      for (const centre of centresFor(frame, bounds, options.position, options.mosaic)) {
        // The visual box is the cap height above the baseline; centring on
        // it rather than on the full line keeps the text optically centred.
        const origin = originFor(frame, centre, textWidth, ascent, rotation);
        const rotate = degrees(origin.angle);

        if (background) {
          const corner = along(origin, origin.angle, -pad, -descent - pad);
          page.drawRectangle({
            x: corner.x,
            y: corner.y,
            width: textWidth + pad * 2,
            height: ascent + descent + pad * 2,
            color: background,
            opacity,
            rotate,
          });
        }

        page.drawText(options.text, { x: origin.x, y: origin.y, size, font, color, opacity, rotate });

        if (options.underline) {
          const y = -Math.max(1, size * 0.12);
          const start = along(origin, origin.angle, 0, y);
          const end = along(origin, origin.angle, textWidth, y);
          page.drawLine({ start, end, thickness: Math.max(0.75, size / 16), color, opacity });
        }
      }
    } else if (image && options.type === "image") {
      const width = frame.width * Math.min(1, Math.max(0.05, options.scale));
      const height = (image.height / image.width) * width;
      const bounds = rotatedBounds(width, height, rotation);

      for (const centre of centresFor(frame, bounds, options.position, options.mosaic)) {
        const origin = originFor(frame, centre, width, height, rotation);
        page.drawImage(image, {
          x: origin.x,
          y: origin.y,
          width,
          height,
          opacity,
          rotate: degrees(origin.angle),
        });
      }
    }

    if (options.layer === "below") sendToBack(page);
  }

  return doc.save();
}
