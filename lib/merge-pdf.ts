import { PDFDocument, degrees, type PDFPage } from "pdf-lib";

export interface PageOrderItem {
  /** Position of the source in the uploaded file list. */
  fileIndex: number;
  /** Zero-based page of that source. */
  pageIndex: number;
  /** Extra clockwise rotation in degrees (multiples of 90, may be negative). */
  rotation?: number;
}

export class MergeInputError extends Error {}

/** Validates an untrusted pageOrder payload; throws MergeInputError when malformed. */
export function parsePageOrder(json: string | null): PageOrderItem[] | null {
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new MergeInputError("The page order sent with the files could not be read.");
  }
  if (!Array.isArray(value)) throw new MergeInputError("The page order must be a list.");
  return value.map((item) => {
    const { fileIndex, pageIndex, rotation } = (item ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(fileIndex) || !Number.isInteger(pageIndex)) {
      throw new MergeInputError("The page order contains an invalid entry.");
    }
    return {
      fileIndex: fileIndex as number,
      pageIndex: pageIndex as number,
      rotation: Number.isInteger(rotation) ? (rotation as number) : 0,
    };
  });
}

/**
 * Merges the sources into one PDF. With a page order, only those pages, in that
 * order and rotation; without one, every page of every file in upload order.
 * `names` is only used for error messages.
 */
export async function mergePdfs(
  sources: Uint8Array[],
  names: string[],
  pageOrder: PageOrderItem[] | null
): Promise<Uint8Array> {
  const docs: PDFDocument[] = [];
  for (let i = 0; i < sources.length; i++) {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(sources[i], { ignoreEncryption: true, updateMetadata: false });
    } catch {
      throw new MergeInputError(`${names[i] ?? "A file"} could not be read as a PDF.`);
    }
    if (doc.isEncrypted) {
      throw new MergeInputError(
        `${names[i] ?? "A file"} is password protected. Remove the password with the Unlock PDF tool first.`
      );
    }
    docs.push(doc);
  }

  const order: PageOrderItem[] =
    pageOrder ?? docs.flatMap((doc, fileIndex) => doc.getPageIndices().map((pageIndex) => ({ fileIndex, pageIndex })));

  const valid = order.filter((item) => {
    const source = docs[item.fileIndex];
    return source && item.pageIndex >= 0 && item.pageIndex < source.getPageCount();
  });

  // Each file's pages are copied in one copyPages call. Copied one page at a
  // time, pdf-lib duplicates every shared resource per call, so an image or
  // font used on several pages was stored once per page — merging a 3.5 MB
  // file came out at 7 MB.
  const merged = await PDFDocument.create();
  const copied = new Map<string, PDFPage>();
  for (let fileIndex = 0; fileIndex < docs.length; fileIndex++) {
    const indices = [...new Set(valid.filter((i) => i.fileIndex === fileIndex).map((i) => i.pageIndex))];
    if (indices.length === 0) continue;
    const pages = await merged.copyPages(docs[fileIndex], indices);
    indices.forEach((pageIndex, k) => copied.set(`${fileIndex}:${pageIndex}`, pages[k]));
  }

  const used = new Set<string>();
  for (const item of valid) {
    const key = `${item.fileIndex}:${item.pageIndex}`;
    // A page placed twice needs its own copy; the first use takes the shared one.
    const page = used.has(key)
      ? (await merged.copyPages(docs[item.fileIndex], [item.pageIndex]))[0]
      : copied.get(key)!;
    used.add(key);
    if (item.rotation) {
      const angle = (((page.getRotation().angle + item.rotation) % 360) + 360) % 360;
      page.setRotation(degrees(angle));
    }
    merged.addPage(page);
  }

  if (merged.getPageCount() === 0) throw new MergeInputError("None of the selected pages could be found.");
  return merged.save({ useObjectStreams: true });
}
