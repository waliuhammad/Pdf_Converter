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

export async function translateLines(
  language: string,
  lines: string[]
): Promise<string[]> {
  if (!lines || lines.length === 0) return [];

  // Track non-empty lines with indices to preserve exact positioning
  const nonEmptyIndices: number[] = [];
  const nonEmptyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i];
    if (typeof text === "string" && text.trim().length > 0) {
      nonEmptyIndices.push(i);
      nonEmptyLines.push(text);
    }
  }

  if (nonEmptyLines.length === 0) return lines;

  const CHUNK_SIZE = 35;
  const translatedMap = new Map<number, string>();
  const chunks: { chunk: string[]; indices: number[] }[] = [];

  for (let c = 0; c < nonEmptyLines.length; c += CHUNK_SIZE) {
    chunks.push({
      chunk: nonEmptyLines.slice(c, c + CHUNK_SIZE),
      indices: nonEmptyIndices.slice(c, c + CHUNK_SIZE),
    });
  }

  const processChunk = async ({ chunk, indices }: { chunk: string[]; indices: number[] }) => {
    const prompt = `Translate each line of text in the provided JSON array into ${language}.
Strict rules:
1. Translate accurately into ${language}.
2. Preserve numbers, symbols, emails, punctuation, and codes where applicable.
3. Return ONLY a valid JSON array of strings containing exactly ${chunk.length} translated strings in the same order.
4. Do not include markdown codeblocks or any additional text.`;

    try {
      const generator = await generateFromDocument(prompt, JSON.stringify(chunk));
      let raw = generator.answer.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      }

      const match = raw.match(/\[[\s\S]*\]/);
      if (match) {
        raw = match[0];
      }

      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        try {
          parsed = JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"));
        } catch {
          // Fallback: split by lines if JSON parsing fails completely
          const rawLines = raw.split(/\r?\n/).map(l => l.replace(/^[-*"\d.)\s]+|["\s,]+$/g, "")).filter(Boolean);
          if (rawLines.length > 0) parsed = rawLines;
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        indices.forEach((origIdx, i) => {
          if (parsed[i] !== undefined && parsed[i] !== null && String(parsed[i]).trim()) {
            translatedMap.set(origIdx, String(parsed[i]));
          } else {
            translatedMap.set(origIdx, chunk[i]);
          }
        });
      } else {
        console.warn("Could not parse translation array, keeping original for chunk");
        indices.forEach((origIdx, i) => {
          translatedMap.set(origIdx, chunk[i]);
        });
      }
    } catch (err) {
      console.error("Error translating lines chunk:", err);
      indices.forEach((origIdx, i) => {
        translatedMap.set(origIdx, chunk[i]);
      });
    }
  };

  for (const chunkData of chunks) {
    await processChunk(chunkData);
  }

  return lines.map((line, idx) => translatedMap.get(idx) ?? line);
}