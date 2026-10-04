import JSZip from "jszip";
import { PDFDocument, degrees } from "pdf-lib";

/**
 * Per-page rotation, in degrees clockwise, added to whatever rotation each
 * page already carries. Indexed by zero-based page number; pages left out
 * (or 0) are untouched.
 */
export type PageRotations = Record<number, number>;

export interface RotateInput {
  name: string;
  bytes: Uint8Array | ArrayBuffer;
  rotations: PageRotations;
}

export interface RotateOutput {
  bytes: Uint8Array;
  filename: string;
  contentType: "application/pdf" | "application/zip";
}

/** A problem with the request, worded for the visitor. */
export class RotateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RotateError";
  }
}

/** pdf-lib rejects negative angles, and 360 should mean "unchanged". */
export function normaliseAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function rotatedName(original: string): string {
  return `${original.replace(/\.pdf$/i, "").trim() || "document"}_rotated.pdf`;
}

/**
 * Untrusted JSON -> PageRotations. Accepts {"0": 90, "3": -90} or an array of
 * angles; anything that is not a multiple of 90 is an error.
 */
export function parseRotations(raw: unknown): PageRotations {
  const out: PageRotations = {};
  if (raw == null) return out;
  if (typeof raw !== "object") throw new RotateError("Rotation settings are malformed.");

  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const index = Number(key);
    const angle = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(index) || index < 0) {
      throw new RotateError("Rotation settings are malformed.");
    }
    if (!Number.isFinite(angle) || angle % 90 !== 0) {
      throw new RotateError("Rotation must be a multiple of 90 degrees.");
    }
    if (normaliseAngle(angle) !== 0) out[index] = normaliseAngle(angle);
  }
  return out;
}

/**
 * Applies the rotations to one PDF. Its RotateError messages are worded to
 * follow the file's name ("<name> could not be read as a PDF.").
 */
export async function rotateOne(
  bytes: Uint8Array | ArrayBuffer,
  rotations: PageRotations
): Promise<Uint8Array> {
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes);
  } catch (err) {
    const encrypted = err instanceof Error && /encrypt/i.test(err.message);
    throw new RotateError(
      encrypted
        ? "is password-protected. Unlock it first, then rotate it."
        : "could not be read as a PDF."
    );
  }
  const pages = pdf.getPages();

  for (const [key, angle] of Object.entries(rotations)) {
    const i = Number(key);
    if (i >= pages.length) {
      throw new RotateError(
        `has ${pages.length} page${pages.length === 1 ? "" : "s"}, so there is no page ${i + 1} to rotate.`
      );
    }
    const current = pages[i].getRotation().angle;
    pages[i].setRotation(degrees(normaliseAngle(current + angle)));
  }

  return pdf.save();
}

/** rotateOne, with the file's name put in front of any problem it reports. */
async function rotateNamed(input: RotateInput): Promise<Uint8Array> {
  try {
    return await rotateOne(input.bytes, input.rotations);
  } catch (err) {
    if (err instanceof RotateError) throw new RotateError(`"${input.name}" ${err.message}`);
    throw err;
  }
}

/** One file comes back as a PDF, several as a ZIP of "<name>_rotated.pdf". */
export async function rotatePdfs(inputs: RotateInput[]): Promise<RotateOutput> {
  if (inputs.length === 0) throw new RotateError("No PDF file provided.");

  if (inputs.length === 1) {
    const [only] = inputs;
    return {
      bytes: await rotateNamed(only),
      filename: rotatedName(only.name),
      contentType: "application/pdf",
    };
  }

  const zip = new JSZip();
  const used = new Set<string>();
  for (const input of inputs) {
    let name = rotatedName(input.name);
    for (let n = 2; used.has(name); n++) name = rotatedName(`${input.name.replace(/\.pdf$/i, "")} (${n})`);
    used.add(name);
    zip.file(name, await rotateNamed(input));
  }

  return {
    bytes: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    filename: "rotated_pdfs.zip",
    contentType: "application/zip",
  };
}
