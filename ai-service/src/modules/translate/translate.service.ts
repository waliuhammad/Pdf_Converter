import { generateFromDocument } from "../generator";
import { TranslateResult } from "./translate.types";

export async function translateDocument(
  language: string,
  documentText: string
): Promise<TranslateResult> {

  const generator = await generateFromDocument(
    `Translate the uploaded PDF into ${language}.

Rules:
- Translate the entire document.
- Preserve headings and formatting where possible.
- Do not summarize.
- Do not omit any information.
- Return only the translated text.`,
    documentText
  );

  return {
    language,
    translatedText: generator.answer,
    downloadable: true,
  };
}