import type { NextConfig } from "next";

// Wherever npm puts it: nested under pdf-to-png-converter today.
const CANVAS = ["./node_modules/pdf-to-png-converter/node_modules/@napi-rs/**/*", "./node_modules/@napi-rs/**/*"];

const nextConfig: NextConfig = {
  /**
   * These resolve files relative to their own package at runtime — pdf.js
   * workers, native bindings, the LibreOffice binary. Bundled into
   * .next/server/chunks they look for those files next to the chunk and fail:
   * /api/pdf-to-image was returning "Setting up fake worker failed: Cannot find
   * module '.next/server/chunks/pdf.worker.mjs'".
   */
  serverExternalPackages: [
    "pdf-to-png-converter",
    "pdf-to-img",
    "pdfjs-dist",
    "canvas",
    "libreoffice-convert",
    // Its OCR worker script is loaded from its own folder at runtime.
    "tesseract.js",
  ],

  /**
   * Files read at runtime with fs, which the bundler cannot see. The PDF text
   * fonts (Urdu/Arabic, Hindi, Latin) have to ship with the routes that draw
   * text — serverless hosts such as Vercel have no system fonts.
   */
  outputFileTracingIncludes: {
    "/api/text-pdf": ["./assets/fonts/**/*"],
    "/api/translate": ["./assets/fonts/**/*"],
    // pdf.js loads its canvas (@napi-rs/canvas and the platform binary) with
    // a require the tracer cannot follow, so on Vercel the renderer had no
    // canvas: "DOMMatrix is not defined", and PDF to Word / Image failed.
    "/api/pdf-to-word": CANVAS,
    "/api/pdf-to-ppt": CANVAS,
    "/api/pdf-to-excel": CANVAS,
    "/api/pdf-to-image": CANVAS,
    "/api/diag": CANVAS,
  },
};

export default nextConfig;
