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

  const response = await withModelFallback((model) =>
    ai.models.generateContent({ model, contents })
  );
  return {
    answer: (response.text ?? "").trim(),
  };
}

/**
 * Runs a Gemini call with GEMINI_MODEL, moving on to the next model in
 * GEMINI_FALLBACK_MODELS whenever one answers 503 (overloaded). Shared by
 * every AI route — OCR included — so a busy model never fails one tool while
 * the others carry on. The last 503, and any other error, is rethrown as is.
 */
export async function withModelFallback<T>(call: (model: string) => Promise<T>): Promise<T> {
  const models = [env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS];

  for (let i = 0; ; i++) {
    try {
      return await call(models[i]);
    } catch (error) {
      const overloaded = (error as { status?: number })?.status === 503;
      if (!overloaded || i === models.length - 1) throw error;
      console.warn(`${models[i]} is overloaded, retrying with ${models[i + 1]}`);
    }
  }
}
