import { parsePDF } from "../parser";
import { cleanText } from "../cleaner";
import { chunkText } from "../chunking";
import { ExtractionResult } from "./pipeline.types";

/**
 * Read a PDF into text.
 *
 * There used to be a second function here, processPDF, which also embedded the
 * chunks and stored them in Chroma for retrieval-backed chat. Chat has been
 * removed, and with it the only caller — so the embedding step, the vector
 * store and the Chroma server they needed are all gone. Summarise, translate,
 * grammar and OCR only ever wanted the text.
 */
export async function extractText(
  buffer: Buffer
): Promise<ExtractionResult> {
  const parser = await parsePDF(buffer);

  const cleaner = cleanText(parser.text);

  const chunker = await chunkText(cleaner.cleanedText);

  return { parser, cleaner, chunker };
}
