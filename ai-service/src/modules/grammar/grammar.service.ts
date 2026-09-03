import { generateFromDocument } from "../generator";
import { GrammarResult } from "./grammar.types";

export async function checkGrammar(
  documentText: string
): Promise<GrammarResult> {
 const generator = await generateFromDocument(
  `You are an expert English grammar and spelling editor.

Correct:
- Grammar mistakes
- Spelling mistakes
- Punctuation errors
- Capitalization errors

Rules:
- Preserve the original meaning.
- Preserve headings.
- Preserve paragraph structure.
- Preserve formatting as much as possible.
- Correct grammar only.
- Correct spelling only.
- Correct punctuation only.
- Correct capitalization only.
- Do NOT summarize.
- Do NOT rewrite for style.
- Do NOT shorten sentences.
- Do NOT expand sentences.
- Do NOT remove any information.
- Return ONLY the corrected text.`,
  documentText
);
 return {
 correctionsMade: 0,
  correctedText: generator.answer,
  originalText: documentText,
  downloadable: true,
};
}