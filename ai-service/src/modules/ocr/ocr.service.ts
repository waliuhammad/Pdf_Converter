import {
  GoogleGenAI,
  createPartFromUri,
  createUserContent,
} from "@google/genai";
import { env } from "../../config/env";
import { OCRResult } from "./ocr.types";

const ai = new GoogleGenAI({
  apiKey: env.GOOGLE_API_KEY,
});

export async function extractTextWithOCR(
  filePath: string
): Promise<OCRResult> {

  const uploadedFile = await ai.files.upload({
    file: filePath,
  });

  const response = await ai.models.generateContent({
    model: env.GEMINI_MODEL,

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
  });
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