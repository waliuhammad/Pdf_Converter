import { createPartFromUri, createUserContent } from "@google/genai";
import { OCRResult } from "./ocr.types";
import { gemini as ai, withModelFallback } from "../generator";

export async function extractTextWithOCR(
  filePath: string
): Promise<OCRResult> {

  const uploadedFile = await ai.files.upload({
    file: filePath,
  });

  // The upload is done once; only the generate call moves between models.
  const response = await withModelFallback((model) =>
    ai.models.generateContent({
      model,
      contents: createUserContent([
        createPartFromUri(uploadedFile.uri!, uploadedFile.mimeType!),
        `
You are a professional OCR engine.

Extract ALL visible text exactly as it appears in the document.

Rules:
- Do NOT summarize.
- Do NOT translate.
- Do NOT correct spelling.
- Do NOT correct grammar.
- Preserve paragraph order.
- Preserve line breaks.
- Preserve numbers exactly.
- Preserve punctuation exactly.
- Return plain text only.
- Do NOT add Markdown formatting.
- Do NOT convert tables into Markdown.
- Do NOT explain anything.
- Return only the extracted text.
`,
      ]),
    })
  );
  const extractedText = response.text ?? "";

return {
  text: extractedText,
  pages: 1,
  words: extractedText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length,
  characters: extractedText.length,
};
}