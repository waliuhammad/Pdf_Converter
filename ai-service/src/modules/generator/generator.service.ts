import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { GeneratorResult } from "./generator.types";

const ai = new GoogleGenAI({
  apiKey: env.GOOGLE_API_KEY,
});

/**
 * Runs one instruction over a document's extracted text. Summary, translate
 * and grammar are all this call with a different prompt.
 *
 * A 503 (model overloaded) moves on to the next model in
 * GEMINI_FALLBACK_MODELS. Any other error, and the last 503, is rethrown
 * untouched so the routes can still tell a busy or rate-limited model (see
 * shared/upstream.ts) from a real failure.
 */
export async function generateFromDocument(
  instruction: string,
  documentText: string
): Promise<GeneratorResult> {
  const contents = `${instruction}\n\n--- DOCUMENT START ---\n${documentText}\n--- DOCUMENT END ---`;
  const models = [env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS];

  for (let i = 0; ; i++) {
    try {
      const response = await ai.models.generateContent({
        model: models[i],
        contents,
      });
      return {
        answer: (response.text ?? "").trim(),
      };
    } catch (error) {
      const overloaded = (error as { status?: number })?.status === 503;
      if (!overloaded || i === models.length - 1) throw error;
      console.warn(`${models[i]} is overloaded, retrying with ${models[i + 1]}`);
    }
  }
}
