import { deflateSync, inflateSync } from "node:zlib";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
} from "pdf-lib";

/**
 * Server-side PDF compression for /api/compress-pdf.
 *
 * Three levels, each a real difference in what is done to the file:
 *
 *   extreme      images downsampled to 72 dpi (relative to the largest page) and
 *                re-encoded as JPEG quality 40; metadata, thumbnails and
 *                editor-private data stripped.
 *   recommended  images downsampled to 144 dpi, JPEG quality 65; same stripping.
 *   less         images downsampled only above 220 dpi, JPEG quality 85, and an
 *                image is only replaced when that saves at least 10%; document
 *                metadata kept.
 *
 * Every level also does the lossless work: unreachable objects are dropped,
 * uncompressed streams are deflated, Flate streams are re-deflated at level 9
 * where that is smaller, and the file is written with object streams.
 *
 * Ghostscript is not available on the server, so images are re-encoded with
 * sharp (which ships with Next). If sharp cannot be loaded the lossless steps
 * still run.
 *
 * The caller is promised never to receive a bigger file: when the result is not
 * smaller than the input, the input bytes are returned unchanged.
 */

export type CompressionLevel = "extreme" | "recommended" | "less";

export const COMPRESSION_LEVELS: readonly CompressionLevel[] = ["extreme", "recommended", "less"];

interface LevelSettings {
  /** Target resolution for images, assuming an image could fill the largest page. */
  dpi: number;
  jpegQuality: number;
  /** Replace an image only when the new one is at most this fraction of the old. */
  minGain: number;
  stripMetadata: boolean;
}

const SETTINGS: Record<CompressionLevel, LevelSettings> = {
  extreme: { dpi: 72, jpegQuality: 40, minGain: 0.98, stripMetadata: true },
  recommended: { dpi: 144, jpegQuality: 65, minGain: 0.95, stripMetadata: true },
  less: { dpi: 220, jpegQuality: 85, minGain: 0.9, stripMetadata: false },
};

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  /** True when compression could not shrink the file and the input is returned as-is. */
  keptOriginal: boolean;
  /** Why the original was kept, when it was. */
  reason?: string;
  imagesRecompressed: number;
}

type SharpFn = typeof import("sharp");
let sharpPromise: Promise<SharpFn | null> | null = null;

function loadSharp(): Promise<SharpFn | null> {
  sharpPromise ??= import("sharp")
    .then((m) => ((m as unknown as { default?: SharpFn }).default ?? (m as unknown as SharpFn)))
    .catch((error) => {
      console.warn("compress-pdf: sharp unavailable, images will not be re-encoded.", error);
      return null;
    });
  return sharpPromise;
}

export async function compressPdf(input: Uint8Array, level: CompressionLevel): Promise<CompressResult> {
  const settings = SETTINGS[level];
  const originalSize = input.byteLength;
  const keep = (reason: string, imagesRecompressed = 0): CompressResult => ({
    bytes: input,
    originalSize,
    compressedSize: originalSize,
    keptOriginal: true,
    reason,
    imagesRecompressed,
  });

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    throw new Error("This file could not be read as a PDF.");
  }
  // Streams of an encrypted file are ciphertext; re-encoding them would destroy it.
  if (doc.isEncrypted) return keep("The PDF is password protected, so it was left unchanged.");

  const context = doc.context;

  if (settings.stripMetadata) stripMetadata(doc);
  removeUnreachableObjects(doc);

  const imagesRecompressed = await recompressImages(doc, settings);

  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (object instanceof PDFRawStream) {
      const smaller = deflateBetter(object);
      if (smaller) context.assign(ref, smaller);
    }
  }

  const output = await doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });

  if (output.byteLength >= originalSize) {
    return keep("This PDF is already well optimised; compressing it would not make it smaller.", imagesRecompressed);
  }
  return {
    bytes: output,
    originalSize,
    compressedSize: output.byteLength,
    keptOriginal: false,
    imagesRecompressed,
  };
}

/* ------------------------------------------------------------------------ */
/* Metadata and dead objects                                                 */
/* ------------------------------------------------------------------------ */

function stripMetadata(doc: PDFDocument) {
  const catalog = doc.catalog;
  catalog.delete(PDFName.of("Metadata"));
  catalog.delete(PDFName.of("PieceInfo"));

  // Keep the title (it is what viewers show in the tab); drop everything else.
  const title = doc.getTitle();
  const info = doc.context.lookup(doc.context.trailerInfo.Info);
  if (info instanceof PDFDict) {
    for (const key of info.keys()) info.delete(key);
  }
  if (title) doc.setTitle(title);

  for (const page of doc.getPages()) {
    page.node.delete(PDFName.of("Thumb"));
    page.node.delete(PDFName.of("PieceInfo"));
    page.node.delete(PDFName.of("Metadata"));
  }
}

/** Walks from the trailer and deletes every object nothing points at. */
function removeUnreachableObjects(doc: PDFDocument) {
  const context = doc.context;
  const reachable = new Set<string>();
  const stack: PDFObject[] = [];
  const { Root, Info, Encrypt } = context.trailerInfo;
  for (const start of [Root, Info, Encrypt]) if (start) stack.push(start);

  while (stack.length > 0) {
    const object = stack.pop()!;
    if (object instanceof PDFRef) {
      const key = object.toString();
      if (reachable.has(key)) continue;
      reachable.add(key);
      const target = context.lookup(object);
      if (target) stack.push(target);
    } else if (object instanceof PDFDict) {
      for (const [, value] of object.entries()) stack.push(value);
    } else if (object instanceof PDFArray) {
      for (const value of object.asArray()) stack.push(value);
    } else if (object instanceof PDFStream) {
      stack.push(object.dict);
    }
  }

  for (const [ref] of context.enumerateIndirectObjects()) {
    if (!reachable.has(ref.toString())) context.delete(ref);
  }
}

/* ------------------------------------------------------------------------ */
/* Lossless stream recompression                                             */
/* ------------------------------------------------------------------------ */

function filterNames(dict: PDFDict): string[] {
  const filter = dict.lookup(PDFName.of("Filter"));
  if (!filter) return [];
  if (filter instanceof PDFName) return [filter.decodeText()];
  if (filter instanceof PDFArray) {
    return filter.asArray().map((f) => (f instanceof PDFName ? f.decodeText() : "?"));
  }
  return ["?"];
}

/**
 * Deflates an uncompressed stream, or re-deflates a plain Flate stream at the
 * highest level. Returns null when that would not be smaller.
 */
function deflateBetter(stream: PDFRawStream): PDFRawStream | null {
  const filters = filterNames(stream.dict);
  const original = stream.contents;
  if (original.byteLength < 256) return null;

  let raw: Uint8Array;
  if (filters.length === 0) {
    // A predictor on an unfiltered stream would start applying to our Flate data.
    if (stream.dict.has(PDFName.of("DecodeParms"))) return null;
    raw = original;
  } else if (filters.length === 1 && filters[0] === "FlateDecode") {
    try {
      raw = inflateSync(original);
    } catch {
      return null;
    }
  } else {
    return null;
  }

  const deflated = deflateSync(raw, { level: 9 });
  if (deflated.byteLength >= original.byteLength - 16) return null;

  const dict = stream.dict.clone(stream.dict.context);
  dict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
  // DecodeParms (a predictor) still applies to the inflated bytes, so it stays.
  return PDFRawStream.of(dict, new Uint8Array(deflated.buffer, deflated.byteOffset, deflated.byteLength));
}

/* ------------------------------------------------------------------------ */
/* Images                                                                    */
/* ------------------------------------------------------------------------ */

/** Number of colour components of a colour space we know how to re-encode, else null. */
function componentsOf(doc: PDFDocument, space: PDFObject | undefined): number | null {
  const resolved = space instanceof PDFRef ? doc.context.lookup(space) : space;
  if (resolved instanceof PDFName) {
    const name = resolved.decodeText();
    if (name === "DeviceRGB") return 3;
    if (name === "DeviceGray") return 1;
    return null;
  }
  if (resolved instanceof PDFArray && resolved.size() === 2) {
    const kind = resolved.lookup(0);
    if (!(kind instanceof PDFName) || kind.decodeText() !== "ICCBased") return null;
    const profile = resolved.lookup(1);
    if (!(profile instanceof PDFStream)) return null;
    const n = profile.dict.lookup(PDFName.of("N"));
    if (n instanceof PDFNumber && (n.asNumber() === 1 || n.asNumber() === 3)) return n.asNumber();
  }
  return null;
}

function largestPageSide(doc: PDFDocument): number {
  let largest = 0;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    largest = Math.max(largest, width, height);
  }
  return largest || 842; // A4 if a page reports nothing usable
}

async function recompressImages(doc: PDFDocument, settings: LevelSettings): Promise<number> {
  const sharp = await loadSharp();
  if (!sharp) return 0;

  const context = doc.context;
  const maxSidePx = Math.round((largestPageSide(doc) / 72) * settings.dpi);

  // Soft masks are images too, but they are alpha channels: re-encoding them
  // as JPEG would put noise into transparency edges, so they are left alone.
  const maskRefs = new Set<string>();
  for (const [, object] of context.enumerateIndirectObjects()) {
    if (object instanceof PDFStream) {
      for (const key of ["SMask", "Mask"]) {
        const value = object.dict.get(PDFName.of(key));
        if (value instanceof PDFRef) maskRefs.add(value.toString());
      }
    }
  }

  let count = 0;
  for (const [ref, object] of context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    if (maskRefs.has(ref.toString())) continue;
    try {
      const replacement = await recompressImage(doc, object, sharp, settings, maxSidePx);
      if (replacement) {
        context.assign(ref, replacement);
        count++;
      }
    } catch {
      // An image we could not decode is simply left as it was.
    }
  }
  return count;
}

async function recompressImage(
  doc: PDFDocument,
  stream: PDFRawStream,
  sharp: SharpFn,
  settings: LevelSettings,
  maxSidePx: number
): Promise<PDFRawStream | null> {
  const dict = stream.dict;
  const subtype = dict.lookup(PDFName.of("Subtype"));
  if (!(subtype instanceof PDFName) || subtype.decodeText() !== "Image") return null;
  if (stream.contents.byteLength < 8 * 1024) return null;

  const imageMask = dict.lookup(PDFName.of("ImageMask"));
  if (imageMask && imageMask.toString() === "true") return null;
  if (dict.has(PDFName.of("Decode"))) return null;

  const width = (dict.lookup(PDFName.of("Width")) as PDFNumber | undefined)?.asNumber?.();
  const height = (dict.lookup(PDFName.of("Height")) as PDFNumber | undefined)?.asNumber?.();
  const bpc = (dict.lookup(PDFName.of("BitsPerComponent")) as PDFNumber | undefined)?.asNumber?.();
  if (!width || !height) return null;

  const components = componentsOf(doc, dict.get(PDFName.of("ColorSpace")));
  if (components === null) return null;

  const filters = filterNames(dict);
  let pipeline: import("sharp").Sharp;

  if (filters.length === 1 && filters[0] === "DCTDecode") {
    const meta = await sharp(stream.contents).metadata();
    // CMYK JPEGs (often with inverted Adobe values) are left alone.
    if (meta.channels !== components) return null;
    pipeline = sharp(stream.contents);
  } else if (filters.length <= 1 && (filters.length === 0 || filters[0] === "FlateDecode")) {
    if (bpc !== 8) return null;
    let pixels = filters.length === 0 ? stream.contents : new Uint8Array(inflateSync(stream.contents));
    const parms = dict.lookup(PDFName.of("DecodeParms"));
    const predictor = parms instanceof PDFDict ? (parms.lookup(PDFName.of("Predictor")) as PDFNumber | undefined)?.asNumber?.() ?? 1 : 1;
    if (predictor >= 10) {
      const decoded = undoPngPredictor(pixels, width, height, components);
      if (!decoded) return null;
      pixels = decoded;
    } else if (predictor !== 1) {
      return null;
    }
    if (pixels.byteLength < width * height * components) return null;
    pipeline = sharp(pixels, { raw: { width, height, channels: components as 1 | 3 } });
  } else {
    return null;
  }

  const longSide = Math.max(width, height);
  const scale = longSide > maxSidePx ? maxSidePx / longSide : 1;
  const newWidth = Math.max(1, Math.round(width * scale));
  const newHeight = Math.max(1, Math.round(height * scale));
  if (scale < 1) pipeline = pipeline.resize(newWidth, newHeight, { fit: "fill" });
  if (components === 1) pipeline = pipeline.toColourspace("b-w");

  const jpeg = await pipeline.jpeg({ quality: settings.jpegQuality, mozjpeg: true }).toBuffer();
  if (jpeg.byteLength >= stream.contents.byteLength * settings.minGain) return null;

  const newDict = dict.clone(dict.context);
  newDict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
  newDict.delete(PDFName.of("DecodeParms"));
  newDict.set(PDFName.of("Width"), PDFNumber.of(newWidth));
  newDict.set(PDFName.of("Height"), PDFNumber.of(newHeight));
  newDict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
  return PDFRawStream.of(newDict, new Uint8Array(jpeg.buffer, jpeg.byteOffset, jpeg.byteLength));
}

/** Reverses PNG row filters (Predictor >= 10) for 8-bit samples. */
function undoPngPredictor(data: Uint8Array, width: number, height: number, bpp: number): Uint8Array | null {
  const rowLength = width * bpp;
  if (data.byteLength < (rowLength + 1) * height) return null;
  const out = new Uint8Array(rowLength * height);
  for (let y = 0; y < height; y++) {
    const filter = data[y * (rowLength + 1)];
    const inStart = y * (rowLength + 1) + 1;
    const outStart = y * rowLength;
    const prevStart = outStart - rowLength;
    for (let x = 0; x < rowLength; x++) {
      const raw = data[inStart + x];
      const left = x >= bpp ? out[outStart + x - bpp] : 0;
      const up = y > 0 ? out[prevStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? out[prevStart + x - bpp] : 0;
      let value: number;
      switch (filter) {
        case 0: value = raw; break;
        case 1: value = raw + left; break;
        case 2: value = raw + up; break;
        case 3: value = raw + ((left + up) >> 1); break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default: return null;
      }
      out[outStart + x] = value & 0xff;
    }
  }
  return out;
}
