import type { NextConfig } from "next";

// The page renderer's runtime files: pdf.js's native canvas (@napi-rs/canvas
// and its platform binary), its worker script, and the standard fonts,
// character maps, colour profiles and wasm decoders it reads from disk. Wherever
// npm puts them — nested under pdf-to-png-converter today.
const RENDERER = [
  "./node_modules/pdf-to-png-converter/node_modules/@napi-rs/**/*",
  "./node_modules/@napi-rs/**/*",
  "./node_modules/pdf-to-png-converter/node_modules/pdfjs-dist/legacy/build/**/*",
  "./node_modules/pdf-to-png-converter/node_modules/pdfjs-dist/{standard_fonts,cmaps,iccs,wasm}/**/*",
  "./node_modules/pdfjs-dist/{standard_fonts,cmaps}/**/*",
];

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
    // pdf.js loads these with requires and file reads the tracer cannot
    // follow, so on Vercel the renderer failed ("DOMMatrix is not defined",
    // then "Cannot find module .../pdf.worker.mjs") and PDF to Word / Image
    // returned errors.
    "/api/pdf-to-word": RENDERER,
    "/api/pdf-to-ppt": RENDERER,
    "/api/pdf-to-excel": RENDERER,
    "/api/pdf-to-image": RENDERER,
  },
};

export default nextConfig;
