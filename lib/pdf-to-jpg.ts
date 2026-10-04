/**
 * PDF to JPG, on the server.
 *
 * Two modes, as the tool offers them:
 *
 * - "pages": every page (or one chosen page) is rendered and saved as a JPEG.
 *   Rendering is pdf-to-png-converter, which only writes PNG; the PNG is then
 *   re-encoded as a real JPEG with sharp. sharp ships with Next (it is Next's
 *   own image optimiser) and is on Next's default serverExternalPackages list,
 *   so it is loaded from node_modules rather than bundled.
 *
 * - "extract": the images embedded in the PDF are pulled out as they are,
 *   instead of photographing whole pages. A JPEG (DCTDecode) stream already is
 *   a .jpg file and is written out untouched; Flate/LZW/uncompressed pixel data
 *   is decoded here and re-encoded as JPEG.
 */
import sharp from "sharp";
import { pdfToPng } from "pdf-to-png-converter";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
  PDFHexString,
  decodePDFRawStream,
  type PDFObject,
} from "pdf-lib";
import { inflateSync } from "zlib";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";

export type JpgQuality = "normal" | "high";

/** Resolution and JPEG quality per setting. Normal is the sensible default. */
export const QUALITY_SETTINGS: Record<JpgQuality, { dpi: number; jpeg: number }> = {
  normal: { dpi: 150, jpeg: 82 },
  high: { dpi: 300, jpeg: 92 },
};

export interface JpgFile {
  name: string;
  data: Buffer;
}

/** The upload's name without its extension, used as the stem of every output. */
export function baseNameOf(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, "") || "document";
}

/**
 * Render pages as JPEG.
 *
 * @param pages 1-based page numbers, or undefined for every page.
 */
export async function renderPagesToJpg(
  pdf: Uint8Array,
  baseName: string,
  quality: JpgQuality,
  pages?: number[]
): Promise<JpgFile[]> {
  const { dpi, jpeg } = QUALITY_SETTINGS[quality];

  // pdf.js may transfer the buffer it is given, so it gets its own copy.
  const input = new Uint8Array(pdf).buffer;
  const rendered = await withOwnPdfWorker(() =>
    pdfToPng(input, {
      viewportScale: dpi / 72,
      pagesToProcess: pages,
      returnPageContent: true,
      // Font options stay at the library's defaults: in Node, turning font
      // faces on drew the standard 14 fonts as empty boxes, and system fonts
      // swapped Helvetica for a stand-in with broken spacing.
    })
  );

  const out: JpgFile[] = [];
  for (const page of rendered) {
    if (page.kind !== "content" || !page.content) continue;
    const data = await sharp(page.content)
      // A page with no painted background renders transparent; JPEG has no
      // alpha, so it is laid on white as a printed page would be.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: jpeg, mozjpeg: true })
      .withMetadata({ density: dpi })
      .toBuffer();
    out.push({ name: `${baseName}_page-${page.pageNumber}.jpg`, data });
  }
  return out;
}

/* ------------------------------------------------------------------------ */
/* Extract images                                                            */
/* ------------------------------------------------------------------------ */

export interface ExtractResult {
  files: JpgFile[];
  /** Images found but in a format this cannot decode (JPEG 2000, JBIG2, CCITT). */
  skipped: number;
}

/**
 * Pull out the images embedded in the given pages (all pages when omitted).
 *
 * An image used on several pages, or several times on one page, is written
 * once. Images inside form XObjects are found too.
 */
export async function extractImagesAsJpg(
  pdf: Uint8Array,
  baseName: string,
  quality: JpgQuality,
  pages?: number[]
): Promise<ExtractResult> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true, updateMetadata: false });
  const allPages = doc.getPages();
  const wanted = pages ?? allPages.map((_, i) => i + 1);
  const { jpeg } = QUALITY_SETTINGS[quality];

  const seen = new Set<string>();
  const files: JpgFile[] = [];
  let skipped = 0;

  for (const pageNumber of wanted) {
    const page = allPages[pageNumber - 1];
    if (!page) continue;

    const images: PDFRawStream[] = [];
    collectImages(doc, page.node.Resources(), images, seen, new Set());

    let index = 0;
    for (const stream of images) {
      let data: Buffer | null = null;
      try {
        data = await imageStreamToJpeg(doc, stream, jpeg);
      } catch {
        data = null;
      }
      if (!data) {
        skipped++;
        continue;
      }
      index++;
      files.push({ name: `${baseName}_page-${pageNumber}_image-${index}.jpg`, data });
    }
  }

  return { files, skipped };
}

function collectImages(
  doc: PDFDocument,
  resources: PDFDict | undefined,
  out: PDFRawStream[],
  seen: Set<string>,
  visitedForms: Set<string>
): void {
  if (!resources) return;
  const xobjects = resources.lookupMaybe(PDFName.of("XObject"), PDFDict);
  if (!xobjects) return;

  for (const [, value] of xobjects.entries()) {
    const key = value instanceof PDFRef ? value.toString() : null;
    const stream = doc.context.lookup(value);
    if (!(stream instanceof PDFRawStream)) continue;

    const subtype = stream.dict.lookupMaybe(PDFName.of("Subtype"), PDFName);
    if (subtype === PDFName.of("Image")) {
      // A stencil mask has no colours of its own: it is a shape filled with
      // whatever colour the page is using, so there is no picture to save.
      const isMask = stream.dict.lookup(PDFName.of("ImageMask"));
      if (isMask && isMask.toString() === "true") continue;
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      out.push(stream);
    } else if (subtype === PDFName.of("Form")) {
      if (key) {
        if (visitedForms.has(key)) continue;
        visitedForms.add(key);
      }
      const formResources = stream.dict.lookupMaybe(PDFName.of("Resources"), PDFDict);
      collectImages(doc, formResources, out, seen, visitedForms);
    }
  }
}

function filtersOf(stream: PDFStream): string[] {
  const filter = stream.dict.lookup(PDFName.of("Filter"));
  if (filter instanceof PDFName) return [filter.decodeText()];
  if (filter instanceof PDFArray) {
    return filter.asArray().map((f) => (f instanceof PDFName ? f.decodeText() : ""));
  }
  return [];
}

function numberOf(dict: PDFDict, key: string, fallback: number): number {
  const value = dict.lookup(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : fallback;
}

/** How a colour space turns samples into RGB. */
type ColorModel =
  | { kind: "gray" }
  | { kind: "rgb" }
  | { kind: "cmyk" }
  | { kind: "indexed"; base: "gray" | "rgb" | "cmyk"; palette: Uint8Array; hival: number };

function resolveColorSpace(doc: PDFDocument, value: PDFObject | undefined): ColorModel | null {
  const cs = value instanceof PDFRef ? doc.context.lookup(value) : value;

  if (cs instanceof PDFName) {
    const name = cs.decodeText();
    if (name === "DeviceGray" || name === "G" || name === "CalGray") return { kind: "gray" };
    if (name === "DeviceRGB" || name === "RGB" || name === "CalRGB") return { kind: "rgb" };
    if (name === "DeviceCMYK" || name === "CMYK") return { kind: "cmyk" };
    return null;
  }

  if (cs instanceof PDFArray && cs.size() > 0) {
    const family = cs.lookup(0);
    const name = family instanceof PDFName ? family.decodeText() : "";

    if (name === "CalGray") return { kind: "gray" };
    if (name === "CalRGB" || name === "Lab") return name === "Lab" ? null : { kind: "rgb" };

    if (name === "ICCBased") {
      const profile = cs.lookup(1);
      if (profile instanceof PDFStream) {
        const n = numberOf(profile.dict, "N", 3);
        if (n === 1) return { kind: "gray" };
        if (n === 3) return { kind: "rgb" };
        if (n === 4) return { kind: "cmyk" };
      }
      return null;
    }

    if (name === "Indexed" || name === "I") {
      const base = resolveColorSpace(doc, cs.get(1));
      if (!base || base.kind === "indexed") return null;
      const hival = (cs.lookup(2) as PDFNumber).asNumber();
      const lookup = cs.lookup(3);
      let palette: Uint8Array | null = null;
      if (lookup instanceof PDFString || lookup instanceof PDFHexString) palette = lookup.asBytes();
      else if (lookup instanceof PDFRawStream) palette = decodePDFRawStream(lookup).decode();
      if (!palette) return null;
      return { kind: "indexed", base: base.kind, palette, hival };
    }
  }

  return null;
}

function componentsOf(model: ColorModel): number {
  switch (model.kind) {
    case "gray":
    case "indexed":
      return 1;
    case "rgb":
      return 3;
    case "cmyk":
      return 4;
  }
}

/** Undo the PNG row predictors (Predictor 10-15) used with Flate streams. */
function undoPngPredictor(data: Uint8Array, colors: number, bpc: number, columns: number): Uint8Array {
  const bpp = Math.max(1, Math.ceil((colors * bpc) / 8));
  const rowLength = Math.ceil((colors * bpc * columns) / 8);
  const rows = Math.floor(data.length / (rowLength + 1));
  const out = new Uint8Array(rows * rowLength);
  const prev = new Uint8Array(rowLength);

  for (let r = 0; r < rows; r++) {
    const type = data[r * (rowLength + 1)];
    const src = r * (rowLength + 1) + 1;
    const row = out.subarray(r * rowLength, (r + 1) * rowLength);
    for (let i = 0; i < rowLength; i++) {
      const raw = data[src + i];
      const left = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i];
      const upLeft = i >= bpp ? prev[i - bpp] : 0;
      let value: number;
      switch (type) {
        case 1:
          value = raw + left;
          break;
        case 2:
          value = raw + up;
          break;
        case 3:
          value = raw + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          value = raw;
      }
      row[i] = value & 0xff;
    }
    prev.set(row);
  }
  return out;
}

/** Decode every filter except a final image codec, then apply any predictor. */
function decodeSamples(stream: PDFRawStream, colors: number, bpc: number, width: number): Uint8Array {
  const filters = filtersOf(stream);
  let data: Uint8Array;

  if (filters.length === 1 && (filters[0] === "FlateDecode" || filters[0] === "Fl")) {
    // zlib directly: some producers write streams pdf-lib's own inflater rejects.
    data = new Uint8Array(inflateSync(stream.contents));
  } else {
    data = decodePDFRawStream(stream).decode();
  }

  const parms = stream.dict.lookup(PDFName.of("DecodeParms"));
  const parmDict = parms instanceof PDFDict ? parms : parms instanceof PDFArray ? parms.lookup(0) : undefined;
  if (parmDict instanceof PDFDict) {
    const predictor = numberOf(parmDict, "Predictor", 1);
    if (predictor >= 10) {
      data = undoPngPredictor(
        data,
        numberOf(parmDict, "Colors", colors),
        numberOf(parmDict, "BitsPerComponent", bpc),
        numberOf(parmDict, "Columns", width)
      );
    } else if (predictor === 2) {
      throw new Error("TIFF predictor not supported");
    }
  }
  return data;
}

/** Unpack samples of any bit depth to one byte per component (0-255 for colour, raw index for palettes). */
function unpack(data: Uint8Array, width: number, height: number, comps: number, bpc: number, scale: boolean): Uint8Array {
  const out = new Uint8Array(width * height * comps);
  if (bpc === 8) {
    out.set(data.subarray(0, out.length));
    return out;
  }
  if (bpc === 16) {
    for (let i = 0; i < out.length; i++) out[i] = data[i * 2];
    return out;
  }

  const rowBytes = Math.ceil((width * comps * bpc) / 8);
  const max = (1 << bpc) - 1;
  for (let y = 0; y < height; y++) {
    for (let i = 0; i < width * comps; i++) {
      const bit = i * bpc;
      const byte = data[y * rowBytes + (bit >> 3)] ?? 0;
      const value = (byte >> (8 - bpc - (bit & 7))) & max;
      out[y * width * comps + i] = scale ? Math.round((value * 255) / max) : value;
    }
  }
  return out;
}

function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  return [
    255 - Math.min(255, c + k),
    255 - Math.min(255, m + k),
    255 - Math.min(255, y + k),
  ];
}

/** Samples in any supported model to packed RGB. */
function toRgb(samples: Uint8Array, pixels: number, model: ColorModel): Uint8Array {
  const rgb = new Uint8Array(pixels * 3);
  for (let p = 0; p < pixels; p++) {
    let r: number, g: number, b: number;
    switch (model.kind) {
      case "gray":
        r = g = b = samples[p];
        break;
      case "rgb":
        r = samples[p * 3];
        g = samples[p * 3 + 1];
        b = samples[p * 3 + 2];
        break;
      case "cmyk":
        [r, g, b] = cmykToRgb(samples[p * 4], samples[p * 4 + 1], samples[p * 4 + 2], samples[p * 4 + 3]);
        break;
      case "indexed": {
        const index = Math.min(samples[p], model.hival);
        const n = model.base === "gray" ? 1 : model.base === "rgb" ? 3 : 4;
        const at = index * n;
        const pal = model.palette;
        if (model.base === "gray") r = g = b = pal[at] ?? 0;
        else if (model.base === "rgb") {
          r = pal[at] ?? 0;
          g = pal[at + 1] ?? 0;
          b = pal[at + 2] ?? 0;
        } else [r, g, b] = cmykToRgb(pal[at] ?? 0, pal[at + 1] ?? 0, pal[at + 2] ?? 0, pal[at + 3] ?? 0);
        break;
      }
    }
    rgb[p * 3] = r;
    rgb[p * 3 + 1] = g;
    rgb[p * 3 + 2] = b;
  }
  return rgb;
}

/** A soft mask (alpha) for the image, if it has one of the same size. */
function readSoftMask(doc: PDFDocument, stream: PDFRawStream, width: number, height: number): Uint8Array | null {
  const smask = stream.dict.lookup(PDFName.of("SMask"));
  if (!(smask instanceof PDFRawStream)) return null;
  const w = numberOf(smask.dict, "Width", 0);
  const h = numberOf(smask.dict, "Height", 0);
  if (w !== width || h !== height) return null;
  const filters = filtersOf(smask);
  if (filters.some((f) => f === "DCTDecode" || f === "JPXDecode")) return null;
  const bpc = numberOf(smask.dict, "BitsPerComponent", 8);
  try {
    return unpack(decodeSamples(smask, 1, bpc, w), w, h, 1, bpc, true);
  } catch {
    return null;
  }
}

async function imageStreamToJpeg(doc: PDFDocument, stream: PDFRawStream, quality: number): Promise<Buffer | null> {
  const filters = filtersOf(stream);
  const last = filters[filters.length - 1];
  const width = numberOf(stream.dict, "Width", 0);
  const height = numberOf(stream.dict, "Height", 0);
  if (!width || !height) return null;

  const model = resolveColorSpace(doc, stream.dict.get(PDFName.of("ColorSpace")));

  if (last === "DCTDecode" || last === "DCT") {
    // Anything before the JPEG codec (rarely, ASCII85) is undone first.
    const jpegBytes =
      filters.length === 1 ? stream.contents : decodePDFRawStream(stream).decode();
    const bytes = Buffer.from(jpegBytes);
    // An RGB or grey JPEG is already exactly the file wanted. A CMYK one is
    // converted, because most viewers show CMYK JPEGs wrongly or not at all.
    if (model && model.kind === "cmyk") {
      return sharp(bytes).toColourspace("srgb").jpeg({ quality }).toBuffer();
    }
    return bytes;
  }

  // JPEG 2000, JBIG2 and fax-coded images need codecs this does not carry.
  if (last === "JPXDecode" || last === "JBIG2Decode" || last === "CCITTFaxDecode" || last === "CCF") {
    return null;
  }

  if (!model) return null;
  const bpc = numberOf(stream.dict, "BitsPerComponent", 8);
  const comps = componentsOf(model);
  const samples = unpack(
    decodeSamples(stream, comps, bpc, width),
    width,
    height,
    comps,
    bpc,
    model.kind !== "indexed"
  );
  const rgb = toRgb(samples, width * height, model);

  const alpha = readSoftMask(doc, stream, width, height);
  if (alpha) {
    // JPEG cannot hold transparency, so transparent parts become white.
    for (let p = 0; p < width * height; p++) {
      const a = alpha[p] / 255;
      for (let c = 0; c < 3; c++) {
        rgb[p * 3 + c] = Math.round(rgb[p * 3 + c] * a + 255 * (1 - a));
      }
    }
  }

  return sharp(Buffer.from(rgb), { raw: { width, height, channels: 3 } })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}
