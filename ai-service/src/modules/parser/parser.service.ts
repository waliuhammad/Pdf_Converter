import { getDocument } from "pdfjs-dist/legacy/build/pdf.js";
import { ParseResult } from "./parser.types";

/**
 * pdf-parse was doing this, but it is a 2018 package wrapping a pdf.js from the
 * same era, and it failed intermittently on PDFs that use cross-reference and
 * object streams — the same bytes parsing one moment and raising "Invalid PDF
 * structure" the next. pdfjs-dist is the same engine, maintained.
 */
export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const doc = await getDocument({
      // pdf.js takes ownership of the array it is given, so hand it a copy
      // rather than the caller's buffer.
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;

    try {
      const pages: string[] = [];

      for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
        const page = await doc.getPage(pageNo);
        const content = await page.getTextContent();

        let text = "";
        for (const item of content.items) {
          if (!("str" in item)) continue;
          text += item.str;
          if (item.hasEOL) text += "\n";
        }

        pages.push(text);
        page.cleanup();
      }

      // pdf.js types getMetadata().info as the bare Object type, so name the
      // shape we actually read out of it.
      const { info } = (await doc.getMetadata()) as unknown as {
        info?: Record<string, string | undefined>;
      };

      return {
        success: true,
        text: pages.join("\n\n"),
        totalPages: doc.numPages,
        metadata: {
          title: info?.Title,
          author: info?.Author,
          creator: info?.Creator,
          producer: info?.Producer,
          creationDate: info?.CreationDate,
          modificationDate: info?.ModDate,
        },
      };
    } finally {
      await doc.destroy();
    }
  } catch (error) {
    // Keep the underlying reason. Swallowing it meant every bad PDF, every
    // password-protected one and every genuine bug all read "Failed to parse PDF."
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse PDF: ${reason}`);
  }
}
