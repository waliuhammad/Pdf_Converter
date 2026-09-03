import type { NextConfig } from "next";

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
  ],
};

export default nextConfig;
