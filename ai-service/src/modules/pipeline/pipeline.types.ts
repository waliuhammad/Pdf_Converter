import { ParseResult } from "../parser";
import { CleanerResult } from "../cleaner";
import { ChunkingResult } from "../chunking";

/** Reading a PDF into text. Everything a tool needs that does not search the document. */
export interface ExtractionResult {
  parser: ParseResult;
  cleaner: CleanerResult;
  chunker: ChunkingResult;
}
