import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt-lite";
import { rejectBadUpload, contentDisposition } from "@/lib/uploads";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Missing PDF file." }, { status: 400 });
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    if (!password || password.trim().length === 0) {
      return NextResponse.json({ error: "Password is required for protection." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    // Encrypt the PDF securely with the user password
    const encryptedBytes = await encryptPDF(pdfBytes, password);

    return new Response(encryptedBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}-protected.pdf`),
      },
    });
  } catch (err) {
    console.error("PDF Encryption Error:", err);
    return NextResponse.json({ error: "Failed to protect PDF document." }, { status: 500 });
  }
});