import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env";
import { GeneratorResult } from "./generator.types";

/**
 * The one Gemini client, shared by every AI route.
 *
 * The SDK's own retries are switched off. By default it retries a 503 five
 * times with back-off of up to a minute between tries, entirely silently, so
 * a saturated model held each request for two to four minutes before
 * withModelFallback ever saw the error — and gemini-3.8-flash, slow rather
 * than failing, took 119 s for a four-line summary. With one attempt and a
 * time limit, a busy or slow model hands over to the next one within
 * MODEL_TIMEOUT_MS instead.
 */
const MODEL_TIMEOUT_MS = 45_000;

export const gemini = new GoogleGenAI({
  apiKey: env.GOOGLE_API_KEY,
  httpOptions: { timeout: MODEL_TIMEOUT_MS, retryOptions: { attempts: 1 } },
});
const ai = gemini;

/**
 * Runs one instruction over a document's extracted text. Summary, translate
 * and grammar are all this call with a different prompt.
 *
 * A busy or slow model moves on to the next one in GEMINI_FALLBACK_MODELS. Any other error, and the last 503, is rethrown
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
 * GEMINI_FALLBACK_MODELS whenever one is busy (429/503) or does not answer
 * within MODEL_TIMEOUT_MS. Shared by every AI route — OCR included — so a busy
 * model never fails one tool while the others carry on. The last such error,
 * and any other error, is rethrown as is.
 */
export async function withModelFallback<T>(call: (model: string) => Promise<T>): Promise<T> {
  const models = [env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS];

  for (let i = 0; ; i++) {
    try {
      return await call(models[i]);
    } catch (error) {
      if (!isBusyOrSlow(error) || i === models.length - 1) throw error;
      console.warn(`${models[i]} is busy or too slow, retrying with ${models[i + 1]}`);
    }
  }
}

/** 503 overloaded, 429 rate-limited for that model, or our time limit hit. */
function isBusyOrSlow(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 503 || status === 429 || status === 408 || status === 504) return true;
  const name = (error as { name?: string })?.name ?? "";
  const message = error instanceof Error ? error.message : String(error);
  return name === "AbortError" || name === "TimeoutError" || /abort|timed? ?out/i.test(message);
}
