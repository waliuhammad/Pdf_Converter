import { CleanerResult } from "./cleaner.types";

export function cleanText(text: string): CleanerResult {
  const cleanedText = text
    // Remove extra spaces
    .replace(/[ \t]+/g, " ")

    // Remove extra blank lines
    .replace(/\n\s*\n/g, "\n")

    // Trim leading/trailing spaces
    .trim();

  return {
    success: true,
    cleanedText,
    originalLength: text.length,
    cleanedLength: cleanedText.length,
  };
}