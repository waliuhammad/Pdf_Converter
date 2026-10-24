
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
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  // Tried in order when GEMINI_MODEL fails (503, 429, 404, etc.)
  GEMINI_FALLBACK_MODELS: (
    process.env.GEMINI_FALLBACK_MODELS ||
    "gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-flash-latest,gemini-3.5-flash"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
};
