/**
 * The one place this service reads its environment, so every default lives
 * here once.
 *
 * It loads .env itself. server.ts also calls dotenv.config(), but imports are
 * hoisted above that call, so by the time it runs this module (imported via
 * app -> routes -> services) has already been evaluated.
 *
 * GOOGLE_API_KEY is required: without it every AI route would fail on its
 * first request with an opaque Gemini error, so fail at startup instead with
 * a message that says what to do.
 */
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY?.trim();

if (!GOOGLE_API_KEY) {
  throw new Error(
    "GOOGLE_API_KEY is not set. Copy ai-service/.env.example to ai-service/.env " +
      "and add a key from https://aistudio.google.com/apikey."
  );
}

export const env = {
  GOOGLE_API_KEY,
  // 8001 is where the main app looks when AI_SERVICE_URL is unset.
  PORT: process.env.PORT || "8001",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  // Tried in order when GEMINI_MODEL answers 503 (overloaded). The newest
  // models are the ones most often saturated, so older ones make good backups.
  GEMINI_FALLBACK_MODELS: (
    process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash,gemini-flash-lite-latest"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
};
