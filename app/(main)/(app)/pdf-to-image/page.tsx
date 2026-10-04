"use client";

import React, { useState } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { loadPdfjs } from "@/lib/pdf-libs";
import { downloadBlob } from "@/lib/download";
import {
  FileText,
  Trash2,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Images,
  FileImage,
} from "lucide-react";

type Mode = "pages" | "extract";
type Quality = "normal" | "high";
type Scope = "all" | "single";

async function getPdfPageCount(arrayBuffer: ArrayBuffer): Promise<number> {
  const pdfjsLib = await loadPdfjs();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  return pdf.numPages;
}

/** The name the server gave the download, so a .jpg and a .zip are each named for what they hold. */
function filenameFromResponse(response: Response, fallback: string): string {
  const header = response.headers.get("Content-Disposition") ?? "";
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      // fall through to the plain form
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header);
  return plain ? plain[1] : fallback;
}

const MODES: { id: Mode; title: string; hint: string; icon: React.ElementType }[] = [
  {
    id: "pages",
    title: "Page to JPG",
    hint: "Every page becomes a JPG image.",
    icon: FileImage,
  },
  {
    id: "extract",
    title: "Extract images",
    hint: "Save the pictures embedded in the PDF.",
    icon: Images,
  },
];

const QUALITIES: { id: Quality; title: string; hint: string }[] = [
  { id: "normal", title: "Normal", hint: "Recommended · 150 dpi" },
  { id: "high", title: "High", hint: "Sharper, larger files · 300 dpi" },
];

function optionClass(active: boolean): string {
  return `w-full text-left p-3 sm:p-4 rounded-xl border transition-all ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow-md"
      : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
  }`;
}

export default function PdfToJpgPage() {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [mode, setMode] = useState<Mode>("pages");
  const [quality, setQuality] = useState<Quality>("normal");
  const [scope, setScope] = useState<Scope>("all");
  const [pageNumber, setPageNumber] = useState<string>("1");

  const [loading, setLoading] = useState(false);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleFileChange = async (fileList: FileList | null) => {
    const selected = fileList?.[0];
    if (!selected) return;

    setError(null);
    setSuccessMessage(null);

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Invalid file format. Please upload a valid PDF document.");
      return;
    }

    setFile(selected);
    setLoadingInfo(true);
    try {
      setNumPages(await getPdfPageCount(await selected.arrayBuffer()));
      setPageNumber("1");
    } catch (err) {
      console.error(err);
      setError("Failed to read PDF structure. Ensure the file is not corrupted or password-protected.");
      setFile(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setNumPages(0);
    setError(null);
    setSuccessMessage(null);
  };

  const handleConvert = async () => {
    if (!file) {
      setError("Please upload a PDF file first.");
      return;
    }

    const parsedPage = parseInt(pageNumber, 10);
    if (scope === "single" && (isNaN(parsedPage) || parsedPage < 1 || parsedPage > numPages)) {
      setError(`Please enter a valid page number between 1 and ${numPages}.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // The route is metered, so the operation is counted (and refunded on
      // failure) there; nothing is claimed from the browser.
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);
      formData.append("quality", quality);
      if (scope === "single") formData.append("pageNumber", String(parsedPage));

      const response = await fetch("/api/pdf-to-image", { method: "POST", body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? body?.message ?? "Could not convert this PDF to JPG.");
        return;
      }

      const blob = await response.blob();
      const base = file.name.replace(/\.[^/.]+$/, "");
      const isZip = (response.headers.get("Content-Type") ?? "").includes("zip");
      const filename = filenameFromResponse(response, isZip ? `${base}_jpg.zip` : `${base}.jpg`);
      downloadBlob(blob, filename);

      setSuccessMessage(
        isZip
          ? "Done! Your JPG images were downloaded in a ZIP file."
          : "Done! Your JPG image has been downloaded."
      );
    } catch {
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel =
    mode === "extract"
      ? scope === "single"
        ? `Extract images from page ${pageNumber}`
        : "Extract images"
      : scope === "single"
        ? `Convert page ${pageNumber} to JPG`
        : "Convert to JPG";

  return (
    <main className="w-full text-foreground py-6 px-4 sm:py-10 sm:px-6 transition-colors">
      <div className="max-w-3xl mx-auto space-y-5 sm:space-y-8">
        <div className="text-center space-y-1.5 sm:space-y-3">
          <div className="flex justify-center mb-1 sm:mb-0">
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-card border border-border shadow-sm sm:w-auto sm:h-auto sm:inline-flex sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:rounded-full sm:bg-primary/10 sm:border-primary/20">
              <FileCheck className="w-5 h-5 text-foreground sm:w-4 sm:h-4 sm:text-primary" />
              <span className="hidden sm:inline text-primary text-xs font-semibold tracking-wide uppercase">
                Professional PDF Toolkit
              </span>
            </div>
          </div>
          <h1 className="text-xl leading-tight sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            PDF to JPG
          </h1>
          <p className="text-muted-foreground text-[13px] leading-[18px] sm:text-sm md:text-base max-w-[300px] sm:max-w-xl mx-auto">
            Turn each page into a JPG image, or pull out the pictures embedded in your PDF.
          </p>
        </div>

        <div className="space-y-5 sm:space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {!file ? (
            <UploadCard
              onFiles={handleFileChange}
              title="Drag and drop your PDF here"
              hint="or click to browse from your computer"
            />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl bg-card border border-border shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB •{" "}
                    {loadingInfo ? "Analyzing..." : `${numPages} ${numPages === 1 ? "page" : "pages"}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveFile}
                className="self-end sm:self-auto shrink-0 p-2 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Remove file"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {file && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Conversion mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  {MODES.map((m) => {
                    const Icon = m.icon;
                    const active = mode === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => setMode(m.id)} className={optionClass(active)}>
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="w-4 h-4 shrink-0" /> {m.title}
                        </span>
                        <span className={`block text-xs mt-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {m.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Image quality
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {QUALITIES.map((q) => {
                    const active = quality === q.id;
                    return (
                      <button key={q.id} type="button" onClick={() => setQuality(q.id)} className={optionClass(active)}>
                        <span className="block text-sm font-semibold">{q.title}</span>
                        <span className={`block text-xs mt-1 ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {q.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {mode === "extract" && (
                  <p className="text-xs text-muted-foreground">
                    Embedded JPEGs are saved exactly as they are; other images are converted to JPG at this quality.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pages
                </label>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                      scope === "all"
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    All pages
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("single")}
                    className={`py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                      scope === "single"
                        ? "border-primary bg-primary text-primary-foreground shadow-md"
                        : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    Specific page
                  </button>
                </div>

                {scope === "single" && (
                  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border space-y-2">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Page number (1 to {numPages})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={numPages}
                      value={pageNumber}
                      onChange={(e) => setPageNumber(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-border focus:ring-2 focus:ring-ring focus:outline-none text-foreground bg-background"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleConvert}
                disabled={loading || loadingInfo}
                className="w-full py-3.5 px-5 sm:py-4 sm:px-6 rounded-xl bg-primary border border-primary hover:opacity-90 text-primary-foreground font-semibold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Converting...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 flex-shrink-0" />
                    <span className="text-center">{buttonLabel}</span>
                  </>
                )}
              </button>
              <p className="text-center text-xs text-muted-foreground -mt-2">
                One image downloads as a JPG; several come together in a ZIP.
              </p>
            </>
          )}
        </div>

        <SecureNote />
      </div>
    </main>
  );
}
