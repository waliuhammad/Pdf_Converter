import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import {
  planSplit,
  splitDownloadName,
  splitFileName,
  type SplitOptions,
} from "@/lib/split-plan";

export interface SplitResult {
  bytes: Uint8Array;
  filename: string;
  contentType: "application/pdf" | "application/zip";
  /** How many PDFs the result holds. */
  fileCount: number;
}

/**
 * Splits a PDF as `options` describe. One output is returned as the PDF
 * itself, several as a ZIP of "<original> 1-3.pdf" files.
 *
 * Throws SplitPlanError for options that do not fit the document; anything
 * else pdf-lib throws means the file could not be read.
 */
export async function splitPdf(
  source: Uint8Array | ArrayBuffer,
  originalName: string,
  options: SplitOptions
): Promise<SplitResult> {
  const src = await PDFDocument.load(source);
  const plan = planSplit(options, src.getPageCount());

  const build = async (pages: number[]) => {
    const out = await PDFDocument.create();
    const copied = await out.copyPages(src, pages);
    copied.forEach((p) => out.addPage(p));
    return out.save();
  };

  const filename = splitDownloadName(originalName, plan);

  if (plan.single) {
    return {
      bytes: await build(plan.files[0].pages),
      filename,
      contentType: "application/pdf",
      fileCount: 1,
    };
  }

  const zip = new JSZip();
  const used = new Set<string>();
  for (const group of plan.files) {
    // The same range listed twice would otherwise overwrite itself in the ZIP.
    let name = splitFileName(originalName, group);
    for (let n = 2; used.has(name); n++) {
      name = splitFileName(originalName, { ...group, label: `${group.label} (${n})` });
    }
    used.add(name);
    zip.file(name, await build(group.pages));
  }

  return {
    bytes: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
    filename,
    contentType: "application/zip",
    fileCount: plan.files.length,
  };
}
