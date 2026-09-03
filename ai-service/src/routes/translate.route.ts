import { Router } from "express";
import { upstreamBusy } from "../modules/shared/upstream";
import multer from "multer";
import { extractText } from "../modules/pipeline";
import { translateDocument } from "../modules/translate";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const language = req.body.language;

    // Check PDF
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No PDF uploaded.",
      });
    }

    // Check language
    if (!language) {
      return res.status(400).json({
        success: false,
        message: "Language is required.",
      });
    }

    // Parse + clean + chunk the uploaded PDF (no embeddings needed here)
    const extraction = await extractText(req.file.buffer);

    // Make sure PDF actually contains text
    if (extraction.chunker.chunks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This PDF contains no readable text.",
      });
    }

    const documentText = extraction.chunker.chunks
      .map((chunk) => chunk.content)
      .filter(Boolean)
      .join(" ");

    // Translate
    const result = await translateDocument(language, documentText);

    return res.status(200).json({
      success: true,
      result,
    });

  } catch (error) {
    console.error(error);

    // Was 429-only, and passed Gemini's raw message straight through. 503 is
    // the commoner of the two and was falling to the generic failure below.
    const busy = upstreamBusy(error);
    if (busy) return res.status(busy.status).json(busy.body);

    return res.status(500).json({
      success: false,
      message: "Translation failed.",
    });
  }
});

export default router;