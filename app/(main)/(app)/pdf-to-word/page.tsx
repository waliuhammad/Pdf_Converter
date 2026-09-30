"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   preview the browser just generated from the file the visitor picked: an
   object URL or a canvas data URL. next/image cannot optimise either, since
   there is no server-side image to resize; it would need unoptimized, which
   renders this same tag inside a wrapper. Disabled for the file rather than
   per line because some of these sit inside ternaries, where a JSX comment is
   a syntax error and the two comment styles would have to be mixed. */


import { useState, useRef, useEffect } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import {
  FileText,
  FileSpreadsheet,
  Download,
  Loader2,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import type * as PdfjsLib from "pdfjs-dist";
import { loadPdfjs } from "@/lib/pdf-libs";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function PdfToWordPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  // Preview State
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
  const [renderedPages, setRenderedPages] = useState<{ [pageNumber: number]: string } | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileAdded = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    if (file.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF file.");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setSuccessMessage(false);
    setRenderedPages(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await loadPdfjs();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const loadedPdf = await loadingTask.promise;
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
    } catch (err) {
      if (wasCancelled(err)) return;
      console.error("Error loading PDF for preview:", err);
      setErrorMessage("Failed to load PDF preview layout.");
    }
  };

  // Render pages at a small base scale with a high upscale factor so text stays
  // sharp on high-DPI phones while the physical display size stays compact.
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isCancelled = false;

    const renderAllPages = async () => {
      setIsRendering(true);
      const pagesMap: { [pageNumber: number]: string } = {};

      try {
        for (let i = 1; i <= numPages; i++) {
          if (isCancelled) break;
          const page = await pdfDoc.getPage(i);

          const baseScale = 0.15;
          const upscaleFactor = 4.0; // Supersampling for crisp text at small display sizes
          const viewport = page.getViewport({ scale: baseScale * upscaleFactor });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;

          pagesMap[i] = canvas.toDataURL();
        }

        if (!isCancelled) {
          setRenderedPages(pagesMap);
        }
      } catch (err) {
      if (wasCancelled(err)) return;
        console.error("Pages render error:", err);
      } finally {
        if (!isCancelled) setIsRendering(false);
      }
    };

    renderAllPages();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, numPages]);

  const clearFile = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setSelectedFile(null);
    setErrorMessage(null);
    setSuccessMessage(false);
    setPdfDoc(null);
    setNumPages(0);
    setRenderedPages(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeConversion = async () => {
    const signal = begin();
    if (!selectedFile) return;

    setProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/pdf-to-word", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || "Failed to convert PDF to Word.");
        setProcessing(false);
        return;
      }

      const blob = await response.blob();
      const originalNameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `${originalNameWithoutExt}_converted.docx`);

      setSuccessMessage(true);
    } catch {
      setErrorMessage("An unexpected error occurred during conversion.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-3 border border-primary/20">
          <FileSpreadsheet className="text-primary w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          Convert PDF to Word (DOCX)
        </h1>
        <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Transform your static PDF document layout into a fully editable Microsoft Word document instantly.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => handleFileAdded(e.target.files)}
      />

      {!selectedFile ? (
        <UploadCard
          onFiles={handleFileAdded}
          title="Click to browse or drag & drop a PDF"
          hint="Supports standard text, multi-column blocks, and embedded structures"
        />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary border border-primary/20">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{selectedFile.name}</p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
                  Size: <strong className="text-fg">{formatSize(selectedFile.size)}</strong> • {numPages}{" "}
                  {numPages === 1 ? "Page" : "Pages"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0"
              title="Remove File"
            >
              <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Preview viewer */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center relative min-h-[280px] sm:min-h-[360px] shadow-sm overflow-hidden">
            {isRendering && !renderedPages && (
              <div className="absolute inset-0 bg-black/10 backdrop-blur-xs flex items-center justify-center z-10">
                <Loader2 className="animate-spin text-primary w-7 h-7 sm:w-8 sm:h-8" />
              </div>
            )}
            <div className="max-h-[240px] sm:max-h-[320px] w-full max-w-[190px] sm:max-w-[260px] overflow-y-auto flex flex-col items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-background border border-card [&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full">
              {renderedPages && Object.keys(renderedPages).length > 0 ? (
                Object.entries(renderedPages).map(([pageNum, dataUrl]) => (
                  <div key={pageNum} className="flex flex-col items-center w-full">
                    <img
                      src={dataUrl}
                      alt={`Page ${pageNum}`}
                      className="w-full max-w-full h-auto rounded shadow-md border border-card bg-white"
                    />
                  </div>
                ))
              ) : (
                <div className="h-40 sm:h-48 flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              )}
            </div>
          </div>

          {successMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[13px] sm:text-sm font-semibold flex items-start sm:items-center gap-2">
              <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 mt-0.5 sm:mt-0" />
              <span>Conversion complete. Your Word document has been downloaded.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
              {errorMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={clearFile}
              className="w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl border border-card text-muted hover:text-foreground font-bold text-sm transition-colors"
            >
              Select Different File
            </button>
            <button
              type="button"
              onClick={executeConversion}
              disabled={processing}
              className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 sm:gap-2.5 transition-all"
            >
              {processing ? (
                <Loader2 className="animate-spin w-[18px] h-[18px] sm:w-5 sm:h-5" />
              ) : (
                <Download className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              )}
              {processing ? "Converting to Word..." : "Convert to Word (.docx)"}
            </button>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}