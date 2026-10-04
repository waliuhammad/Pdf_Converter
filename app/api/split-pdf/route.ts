import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";
import { parseSplitOptions, SplitPlanError } from "@/lib/split-plan";
import { splitPdf } from "@/lib/split-pdf";

/**
 * Splits one PDF by custom ranges, fixed-size ranges, every page, or a page
 * selection — optionally merged back into one file. The form carries the
 * file and an `options` JSON field (see SplitOptions in lib/split-plan.ts).
 * One result comes back as a PDF, several as a ZIP.
 */
export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file uploaded." }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    let options;
    try {
      options = parseSplitOptions(JSON.parse(String(formData.get("options") ?? "")));
    } catch (err) {
      const message = err instanceof SplitPlanError ? err.message : "Split options are malformed.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    let result;
    try {
      result = await splitPdf(await file.arrayBuffer(), file.name, options);
    } catch (err) {
      if (err instanceof SplitPlanError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      const encrypted = err instanceof Error && /encrypt/i.test(err.message);
      return NextResponse.json(
        {
          error: encrypted
            ? "This PDF is password-protected. Unlock it first, then split it."
            : "That file could not be read as a PDF.",
        },
        { status: 400 }
      );
    }

    return new NextResponse(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": contentDisposition(result.filename),
        "X-File-Count": String(result.fileCount),
      },
    });
  } catch (error) {
    console.error("PDF Split Error:", error);
    return NextResponse.json({ error: "Failed to split PDF." }, { status: 500 });
  }
});
