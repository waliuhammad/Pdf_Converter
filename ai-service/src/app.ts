import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import parserRoute from "./routes/parser.route";
import summaryRoute from "./routes/summary.route";
import grammarRoute from "./routes/grammar.route";
import translateRoute from "./routes/translate.route";
import ocrRoute from "./routes/ocr.route";
const app = express();

// Middleware
// 100kb default is far too small: summary/translate/grammar receive whole
// documents as JSON text, and a 413 on a normal PDF is not acceptable.
app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api", parserRoute);
app.use("/api/summary", summaryRoute);
app.use("/api/grammar", grammarRoute);
app.use("/api/translate", translateRoute);
app.use("/api", ocrRoute);
// Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "AI Service",
    version: "1.0.0",
  });
});

export default app;