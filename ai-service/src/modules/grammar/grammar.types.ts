export interface GrammarResult {
 correctionsMade: number;
  correctedText: string;
  /**
   * The text as it was read from the document, so the caller can show what
   * changed rather than only the result. Returning it costs nothing here —
   * it is the input this module was already handed.
   */
  originalText: string;
  downloadable: boolean;
}
