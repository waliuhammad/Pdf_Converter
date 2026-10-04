import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/uploads";
import { parseRotations, rotatePdfs, RotateError, type RotateInput } from "@/lib/rotate-pdf";

/** Enough for a batch, small enough that one request cannot hold the server. */
const MAX_FILES = 20;

/**
 * Rotation is a change to one number in each page's dictionary, so pdf-lib
 * does it here.
 *
 * The form carries one or more `file` fields and a `rotations` JSON array in
 * the same order: for each file, an object of zero-based page index -> degrees
 * clockwise (a multiple of 90, added to the page's existing rotation). One file
 * comes back as a PDF, several as a ZIP.
 */
export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const files = formData.getAll("file").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "No PDF file provided." }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Rotate up to ${MAX_FILES} files at a time.` },
        { status: 400 }
      );
    }

    // Size and type are checked here, before anything reads the bytes.
    for (const file of files) {
      const badUpload = rejectBadUpload(file, "pdf");
      if (badUpload) return badUpload;
    }
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_UPLOAD_BYTES * 2) {
      return NextResponse.json(
        { error: `Together these files are too large. Each may be up to ${MAX_UPLOAD_LABEL}; send fewer at once.` },
        { status: 413 }
      );
    }

    let perFile: unknown[];
    try {
      const parsed: unknown = JSON.parse(String(formData.get("rotations") ?? "[]"));
      perFile = Array.isArray(parsed) ? parsed : [];
    } catch {
      return NextResponse.json({ error: "Rotation settings are malformed." }, { status: 400 });
    }

    let result;
    try {
      const inputs: RotateInput[] = [];
      for (const [i, file] of files.entries()) {
        inputs.push({
          name: file.name,
          bytes: await file.arrayBuffer(),
          rotations: parseRotations(perFile[i]),
        });
      }
      result = await rotatePdfs(inputs);
    } catch (err) {
      if (err instanceof RotateError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": contentDisposition(result.filename),
      },
    });
  } catch (error) {
    console.error("Rotate PDF error:", error);
    return NextResponse.json(
      { error: "Failed to rotate PDF file due to an internal server error." },
      { status: 500 }
    );
  }
});
