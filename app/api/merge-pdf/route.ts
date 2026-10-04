import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";
import { MergeInputError, mergePdfs, parsePageOrder } from "@/lib/merge-pdf";

/** Plenty for a merge, and keeps one request from holding too much in memory. */
const MAX_FILES = 30;

export const POST = metered(async (req: NextRequest) => {
  // Every tool counts against the user's daily allowance (2/20/50 by
  // plan, from Remote Config) and therefore requires sign-in.
  const formData = await readFormData(req);
  if (!formData) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  const files = formData
    .getAll("files")
    .filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f);

  if (files.length === 0) {
    return NextResponse.json({ error: "No PDF files provided." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Please merge at most ${MAX_FILES} files at a time.` }, { status: 400 });
  }
  for (const candidate of files) {
    const badUpload = rejectBadUpload(candidate, "pdf");
    if (badUpload) return badUpload;
  }

  try {
    const pageOrder = parsePageOrder(formData.get("pageOrder") as string | null);
    const sources = await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer())));
    const merged = await mergePdfs(sources, files.map((f) => f.name), pageOrder);

    return new NextResponse(Buffer.from(merged), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition("merged.pdf"),
      },
    });
  } catch (error) {
    if (error instanceof MergeInputError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Merge PDF error:", error);
    return NextResponse.json(
      { error: "Failed to merge PDF files. Please verify the uploaded documents." },
      { status: 500 }
    );
  }
});
