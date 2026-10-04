import { NextRequest, NextResponse } from "next/server";
import AdmZip from "adm-zip";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";
import { COMPRESSION_LEVELS, compressPdf, type CompressionLevel } from "@/lib/pdf-compress";

/** Several files go out as one ZIP; this keeps one request from tying up the server. */
const MAX_FILES = 10;

/**
 * One PDF in -> one PDF out (same name). Several in -> a ZIP of them.
 *
 * Per-file sizes travel in the X-Compress-Results header (URI-encoded JSON) so
 * the page can show original size, new size and the saving for each file even
 * when the body is a ZIP.
 */
export const POST = metered(async (req: NextRequest) => {
  const formData = await readFormData(req);
  if (!formData) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  // "file" is what the page used to send; still accepted.
  const files = [...formData.getAll("files"), ...formData.getAll("file")].filter(
    (f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f
  );
  if (files.length === 0) {
    return NextResponse.json({ error: "No PDF file uploaded." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Please compress at most ${MAX_FILES} files at a time.` },
      { status: 400 }
    );
  }
  for (const file of files) {
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;
  }

  const requested = String(formData.get("level") ?? "recommended") as CompressionLevel;
  const level: CompressionLevel = COMPRESSION_LEVELS.includes(requested) ? requested : "recommended";

  const results: {
    name: string;
    originalSize: number;
    compressedSize: number;
    keptOriginal: boolean;
    reason?: string;
  }[] = [];
  const outputs: Uint8Array[] = [];

  for (const file of files) {
    try {
      const result = await compressPdf(new Uint8Array(await file.arrayBuffer()), level);
      outputs.push(result.bytes);
      results.push({
        name: file.name,
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        keptOriginal: result.keptOriginal,
        reason: result.reason,
      });
    } catch (error) {
      console.error("PDF Compression Error:", error);
      return NextResponse.json(
        { error: `Could not compress ${file.name}. Please check it is a valid PDF.` },
        { status: 422 }
      );
    }
  }

  const resultsHeader = encodeURIComponent(JSON.stringify(results));

  if (files.length === 1) {
    return new NextResponse(Buffer.from(outputs[0]), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(files[0].name),
        "X-Compress-Results": resultsHeader,
      },
    });
  }

  const zip = new AdmZip();
  const used = new Set<string>();
  files.forEach((file, i) => {
    zip.addFile(uniqueName(file.name, used), Buffer.from(outputs[i]));
  });

  return new NextResponse(new Uint8Array(zip.toBuffer()), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition("compressed_pdfs.zip"),
      "X-Compress-Results": resultsHeader,
    },
  });
});

/** Two uploads called report.pdf would overwrite each other inside the ZIP. */
function uniqueName(name: string, used: Set<string>): string {
  const safe = name.replace(/[\\/]/g, "_") || "document.pdf";
  let candidate = safe;
  const dot = safe.toLowerCase().endsWith(".pdf") ? safe.length - 4 : safe.length;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) {
    candidate = `${safe.slice(0, dot)} (${n})${safe.slice(dot)}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}
