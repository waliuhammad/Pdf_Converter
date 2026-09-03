import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { decryptPDF } from "@pdfsmaller/pdf-decrypt";
import { PDFDocument, EncryptedPDFError } from "pdf-lib";
import { errorMessage } from "@/lib/errors";
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

    const arrayBuffer = await file.arrayBuffer();
    const pdfBytes = new Uint8Array(arrayBuffer);

    /**
     * Whether the document actually carries a lock.
     *
     * PDFDocument.load refuses any file with an /Encrypt dictionary unless
     * ignoreEncryption is set, so loading cleanly proves there is nothing to
     * unlock. This route used to catch "not encrypted", re-save the file
     * through pdf-lib and return it as "<name>-unlocked.pdf", so an ordinary
     * PDF came back looking like the tool had done something to it.
     */
    let encrypted: boolean;
    try {
      await PDFDocument.load(pdfBytes);
      encrypted = false;
    } catch (loadErr) {
      const message = errorMessage(loadErr, "").toLowerCase();
      // The bundled encryptor's output reports this as a plain Error rather
      // than pdf-lib's EncryptedPDFError, so the message is what identifies it.
      if (loadErr instanceof EncryptedPDFError || message.includes("encrypted")) {
        encrypted = true;
      } else {
        return NextResponse.json(
          { error: "That file could not be read as a PDF." },
          { status: 400 }
        );
      }
    }

    if (!encrypted) {
      return NextResponse.json(
        {
          error:
            "This PDF is not password-protected, so there is nothing to unlock. Use Protect PDF if you want to add a password.",
        },
        { status: 400 }
      );
    }

    const decryptedBytes: Uint8Array = await decryptPDF(pdfBytes, password || "");

    return new Response(decryptedBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(`${file.name.replace(/\.[^/.]+$/, "")}-unlocked.pdf`),
      },
    });
  } catch (err) {
    // The detail stays in the server log. It was being returned to the browser,
    // which meant a file that is not a PDF answered with the decrypt library's
    // internal parser position — "line:0 col:82 offset=41: No PDF header found"
    // — which tells the visitor nothing and describes our dependencies.
    console.error("PDF Decryption Error:", err);

    const detail = errorMessage(err, "").toLowerCase();

    // Structure first. The library wraps everything as "Failed to decrypt
    // PDF: ...", so a file that is not a PDF at all still carries the word
    // decrypt and would otherwise be reported as a wrong password.
    if (detail.includes("pdf header") || detail.includes("parse") || detail.includes("invalid pdf")) {
      return NextResponse.json(
        { error: "That file could not be read as a PDF." },
        { status: 400 }
      );
    }

    // A wrong password is the visitor's input, not a fault on this server, so
    // this was answering 500 for the single most likely outcome of using the
    // tool.
    if (detail.includes("password") || detail.includes("decrypt")) {
      return NextResponse.json(
        { error: "Incorrect password. Please try again." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to unlock PDF document." },
      { status: 500 }
    );
  }
});