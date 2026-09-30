"use client";

import React, { useState, useEffect, useRef, JSX } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { FileText, Trash2, RotateCw, Download, Layers, Loader2 } from "lucide-react";
import { errorName } from "@/lib/errors";
// Type-only, so it adds nothing to the bundle — the library itself still
// arrives through the dynamic import below.
import type * as PdfjsLib from "pdfjs-dist";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function RotatePdfPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(90);
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [pageNumber, setPageNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [libLoading, setLibLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsLib, setPdfjsLib] = useState<typeof PdfjsLib | null>(null);

  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  useEffect(() => {
    let isMounted = true;
    import("pdfjs-dist")
      .then((lib) => {
        if (!isMounted) return;
        if (typeof window !== "undefined") {
          lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`;
        }
        setPdfjsLib(lib);
        setLibLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load pdfjs:", err);
        if (isMounted) {
          setError("Failed to load PDF engine.");
          setLibLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleFileChange = async (fileList: FileList | null): Promise<void> => {
    if (fileList && fileList[0]) {
      const selectedFile = fileList[0];
      if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf")) {
        setFile(selectedFile);
        setRotation(90);
        setMode("all");
        setPageNumber("");
        setError(null);

        if (!pdfjsLib) {
          setError("PDF engine is still initializing. Please wait and re-upload.");
          return;
        }

        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useWorkerFetch: false,
            isEvalSupported: false,
            disableFontFace: true,
          });

          const loadedPdf = await loadingTask.promise;

          if (!loadedPdf || loadedPdf.numPages === 0) {
            throw new Error("No pages found in this PDF.");
          }

          setPdfDoc(loadedPdf);
          setNumPages(loadedPdf.numPages);
        } catch (err) {
      if (wasCancelled(err)) return;
          console.error("PDF parse error:", err);

          if (errorName(err) === "PasswordException") {
            setError("This PDF is password-protected. Please provide an unprotected file.");
          } else {
            setError("Could not read PDF structure. Ensure the file is a valid, uncorrupted PDF.");
          }

          setPdfDoc(null);
          setNumPages(0);
        }
      } else {
        setError("Please upload a valid PDF document.");
      }
    }
  };

  const handleClearFile = (): void => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setPdfDoc(null);
    setNumPages(0);
    setRotation(90);
    setMode("all");
    setPageNumber("");
    setError(null);
  };

  const handleRotatePreview = (): void => {
    setRotation((prev) => {
      if (prev === 90) return 180;
      if (prev === 180) return 270;
      if (prev === 270) return 360;
      return 90;
    });
  };

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isMounted = true;

    const renderPages = async (): Promise<void> => {
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdfDoc.getPage(i);
          const canvas = canvasRefs.current[i];
          if (!canvas || !isMounted) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

          const viewport = page.getViewport({ scale: 1.0 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          const renderTask = page.render(renderContext);
          await renderTask.promise;
        } catch (err) {
      if (wasCancelled(err)) return;
          console.error(`Error rendering page ${i}:`, err);
        }
      }
    };

    renderPages();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, numPages]);

  const handleRotateAndDownload = async (): Promise<void> => {
    const signal = begin();
    if (!file) return;

    if (mode === "custom" && !pageNumber.trim()) {
      setError("Please specify the exact page number you want to rotate.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("rotation", rotation.toString());
      formData.append("mode", mode);
      formData.append("pageNumber", pageNumber);

      const res = await fetch("/api/rotate-pdf", {
        method: "POST",
        body: formData, signal });

      if (!res.ok) {
        let errorMessage = "Rotation failed.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch { }
        throw new Error(errorMessage);
      }

      const blob = await res.blob();
      downloadBlob(blob, `${file.name.replace(/\.[^/.]+$/, "")}_rotated.pdf`);
    } catch (err: unknown) {
      if (wasCancelled(err, signal)) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during rotation.");
      }
    } finally {
      setLoading(false);
    }
  };

  // A quarter turn swaps the page's width and height, but the canvas box is
  // measured before the transform, so a sideways page needs clamping on the
  // opposite axis or it spills out of its frame.
  const isQuarterTurn = (deg: number) => deg % 180 !== 0;

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Header — same pattern as the other tool pages */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-card flex items-center justify-center mb-3 text-fg shadow-sm">
          <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          Rotate PDF Pages
        </h1>
        <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Rotate your entire document or target a single specific page cleanly.
        </p>
      </div>

      {libLoading ? (
        <div className="border-2 border-dashed border-card rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center bg-[var(--background-secondary)] gap-3">
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-fg animate-spin" />
          <span className="text-[13px] sm:text-sm text-muted font-medium">Initializing PDF engine...</span>
        </div>
      ) : !file ? (
        <UploadCard onFiles={handleFileChange} title="Click to browse or drag & drop a PDF" hint="PDF documents" />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-card border border-card flex items-center justify-center text-fg shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{file.name}</p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
                  Size: <strong className="text-fg">{(file.size / (1024 * 1024)).toFixed(2)} MB</strong> •{" "}
                  {numPages} {numPages === 1 ? "Page" : "Pages"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Rotation settings */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-card">
              <RotateCw className="w-4 h-4 text-fg shrink-0" />
              <span className="text-[13px] sm:text-sm font-extrabold text-fg">Rotation Settings</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("all")}
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${mode === "all"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-card text-muted hover:text-foreground"
                  }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Whole Document</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${mode === "custom"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "bg-card border border-card text-muted hover:text-foreground"
                  }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Specific Page</span>
              </button>
            </div>

            {mode === "custom" && (
              <div className="pt-1">
                <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted block mb-1">
                  Target Page (1 – {numPages || 1})
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={numPages || 1}
                  placeholder="e.g. 1"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  className="w-full bg-card border border-card rounded-xl px-3 py-3 sm:py-2.5 text-base sm:text-sm text-fg placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
                />
                <p className="text-[11px] text-muted mt-1.5">Enter the exact page number you wish to rotate.</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={handleRotatePreview}
                className="w-full sm:flex-1 flex items-center justify-center gap-2 py-3.5 sm:py-3 px-4 rounded-xl bg-[var(--background-secondary)] hover:bg-muted border border-card text-[13px] sm:text-sm font-bold text-fg transition shadow-sm"
              >
                <RotateCw className="w-4 h-4 shrink-0" />
                <span>Rotate ({rotation}°)</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation(90)}
                className="w-full sm:w-auto py-3 px-4 rounded-xl border border-card text-muted hover:text-foreground font-bold text-xs transition-colors"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Page preview */}
          {numPages > 0 && (
            <div className="bg-card border border-card rounded-2xl p-3 sm:p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pb-2 mb-3 border-b border-card">
                <span className="text-[10px] sm:text-xs font-extrabold text-fg uppercase tracking-wider">
                  Page Preview ({numPages} Total)
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-md bg-card border border-card text-fg shrink-0">
                  Rotation: {rotation}°
                </span>
              </div>

              <div className="w-full max-h-[340px] sm:max-h-[420px] overflow-y-auto space-y-3 sm:space-y-4 pr-1">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
                  const isTargetRotated = mode === "all" || (mode === "custom" && pageNumber === String(pageNum));
                  const currentDegrees = isTargetRotated ? rotation : 0;

                  return (
                    <div
                      key={pageNum}
                      className="bg-[var(--background-secondary)] border border-card rounded-xl p-2.5 sm:p-3 flex flex-col items-center"
                    >
                      <div className="w-full flex justify-between items-center gap-2 mb-2 text-[11px] text-muted px-1">
                        <span className="font-semibold truncate">
                          Page {pageNum} of {numPages}
                        </span>
                        <span className="bg-card border border-card px-2 py-0.5 rounded text-fg font-mono shrink-0">
                          {currentDegrees}°
                        </span>
                      </div>
                      <div className="w-full h-56 sm:h-80 flex items-center justify-center overflow-hidden bg-muted rounded-lg p-2">
                        <canvas
                          ref={(el) => {
                            canvasRefs.current[pageNum] = el;
                          }}
                          className={`object-contain origin-center shadow-md ${isQuarterTurn(currentDegrees)
                            ? "max-h-full max-w-[13rem] sm:max-w-[19rem]"
                            : "max-h-full max-w-full"
                            }`}
                          style={{
                            transform: `rotate(${currentDegrees}deg)`,
                            transition: "transform 0.3s ease-in-out",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted mt-3 text-center">Scroll to inspect every page.</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleRotateAndDownload}
            disabled={loading}
            className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-[13px] sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary-hover)]"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            ) : (
              <Download className="w-5 h-5 shrink-0" />
            )}
            <span>{loading ? "Processing document..." : "Save & Download PDF"}</span>
          </button>
        </div>
      )}

      {/* Errors before a file is chosen still need somewhere to show */}
      {error && !file && (
        <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] font-semibold text-center">
          {error}
        </div>
      )}

      <SecureNote />
    </div>
  );
}