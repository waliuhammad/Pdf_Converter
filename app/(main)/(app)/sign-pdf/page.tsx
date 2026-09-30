"use client";

import { useState, useRef, useEffect } from "react";
import { FileText, Trash2, Download, PenLine, Loader2, CheckCircle2 } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import type * as PdfjsLib from "pdfjs-dist";
import { loadPdfjs } from "@/lib/pdf-libs";
import { errorName } from "@/lib/errors";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

/**
 * The faces pdf-lib can embed from the PDF standard set, so the preview and
 * the signed file agree. `css` is the nearest browser equivalent for the
 * canvas preview; the id is what the route maps back to a StandardFont.
 */
const FONT_OPTIONS = [
  { id: "helvetica-oblique", label: "Signature (italic)", css: "italic 1em Helvetica, Arial, sans-serif" },
  { id: "helvetica", label: "Sans", css: "1em Helvetica, Arial, sans-serif" },
  { id: "helvetica-bold", label: "Sans bold", css: "bold 1em Helvetica, Arial, sans-serif" },
  { id: "times-italic", label: "Serif italic", css: "italic 1em 'Times New Roman', Times, serif" },
  { id: "times", label: "Serif", css: "1em 'Times New Roman', Times, serif" },
  { id: "times-bold", label: "Serif bold", css: "bold 1em 'Times New Roman', Times, serif" },
  { id: "courier-oblique", label: "Mono italic", css: "italic 1em 'Courier New', Courier, monospace" },
  { id: "courier", label: "Mono", css: "1em 'Courier New', Courier, monospace" },
] as const;

type FontChoice = (typeof FONT_OPTIONS)[number]["id"];

/** Ink colours, matching the palette the watermark tool offers. */
const SIGNATURE_COLORS = [
  "#0f172a",
  "#1d4ed8",
  "#dc2626",
  "#059669",
  "#7c3aed",
  "#d97706",
];

export default function SignPdfPage() {
  const [file, setFile] = useState<{ name: string; size: string; rawFile: File } | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [mode, setMode] = useState<"type" | "draw">("type");
  const [signatureText, setSignatureText] = useState("");

  // PDF Preview and Advanced States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfDocProxy, setPdfDocProxy] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
  const [position, setPosition] = useState<"left" | "center" | "right">("right");
  const [signScope, setSignScope] = useState<"specific" | "all">("specific");

  // Drawing states
  const [penColor, setPenColor] = useState("#0f172a");
  // Typography for the typed signature. The faces are the ones pdf-lib can
  // embed without shipping a font file, so what the preview shows is what the
  // PDF can actually contain.
  const [fontFamily, setFontFamily] = useState<FontChoice>("helvetica-oblique");
  const [fontSize, setFontSize] = useState(18);
  const [isDrawing, setIsDrawing] = useState(false);
  /** True once a stroke has been drawn, so an untouched canvas can't be "signed" with. */
  const [hasDrawn, setHasDrawn] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<PdfjsLib.RenderTask | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (f.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF document.");
      return;
    }

    setFile({ name: f.name, size: formatSize(f.size), rawFile: f });
    setErrorMessage(null);
    setSuccessMessage(false);

    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdfjsLib = await loadPdfjs();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      setPdfDocProxy(pdf);
      setNumPages(pdf.numPages);
      setCurrentPage(1);
    } catch (err) {
      if (wasCancelled(err)) return;
      console.error("Error loading PDF preview:", err);
      setErrorMessage("Failed to load the PDF preview.");
    }
  };

  const clearFile = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setPdfDocProxy(null);
    setNumPages(0);
    setErrorMessage(null);
    setSuccessMessage(false);
  };

  useEffect(() => {
    if (!pdfDocProxy) return;
    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          await renderTaskRef.current.cancel();
        }

        const page = await pdfDocProxy.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = previewCanvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderTask = page.render({ canvasContext: context, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (isCancelled) return;

        const hasSignature = mode === "type" ? signatureText.trim().length > 0 : canvasRef.current !== null;

        if (hasSignature) {
          const margin = 30;
          const sigY = canvas.height - 35;
          let sigX = margin;

          if (mode === "type" && signatureText.trim()) {
            // Was a fixed "italic 18px cursive", so neither the face nor the
            // size chosen in the panel showed here. The CSS shorthand carries
            // style and family together, with 1em swapped for the real size.
            const face =
              FONT_OPTIONS.find((f) => f.id === fontFamily)?.css ?? FONT_OPTIONS[0].css;
            context.font = face.replace("1em", `${fontSize}px`);
            context.fillStyle = penColor;
            const metrics = context.measureText(signatureText);
            const textWidth = metrics.width;

            if (position === "center") {
              sigX = (canvas.width - textWidth) / 2;
            } else if (position === "right") {
              sigX = canvas.width - textWidth - margin;
            }

            context.fillText(signatureText, sigX, sigY);
          } else if (mode === "draw" && canvasRef.current) {
            const drawCanvas = canvasRef.current;
            const imgWidth = 120;
            const imgHeight = 40;

            if (position === "center") {
              sigX = (canvas.width - imgWidth) / 2;
            } else if (position === "right") {
              sigX = canvas.width - imgWidth - margin;
            }

            context.drawImage(drawCanvas, sigX, sigY - imgHeight + 10, imgWidth, imgHeight);
          }
        }
      } catch (err) {
      if (wasCancelled(err)) return;
        // Render cancellations are routine when flipping pages quickly.
        if (errorName(err) !== "RenderingCancelledException") {
          console.error("Preview render error:", err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDocProxy, currentPage, signatureText, mode, position, penColor, fontFamily, fontSize]);

  useEffect(() => {
    if (mode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 340;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.strokeStyle = penColor;
      }
      setHasDrawn(false);
    }
  }, [mode, penColor]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    // The canvas is 340px internally but shrinks to fit narrow screens, so a
    // raw clientX offset landed the stroke away from the fingertip. Scaling
    // by the ratio between the bitmap and its rendered box keeps ink under
    // the pointer at any width.
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (point.clientX - rect.left) * scaleX, y: (point.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  /**
   * Signs on the server and downloads the result. The previous version
   * downloaded the untouched uploaded file under a "signed_" name — the
   * /api/sign-pdf route existed but was never called, so no download was
   * ever actually signed.
   */
  const executeSignAndDownload = async () => {
    const signal = begin();
    if (!file) return;

    setProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(false);

    try {
      const formData = new FormData();
      formData.append("file", file.rawFile);
      formData.append("signMode", mode);
      formData.append("pageNumber", String(currentPage));
      formData.append("position", position);
      formData.append("signScope", signScope);

      if (mode === "type") {
        formData.append("signatureText", signatureText.trim());
        formData.append("fontFamily", fontFamily);
        formData.append("fontSize", String(fontSize));
      } else {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawn) {
          setErrorMessage("Please draw your signature first.");
          setProcessing(false);
          return;
        }
        formData.append("signatureImage", canvas.toDataURL("image/png"));
      }

      const response = await fetch("/api/sign-pdf", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || errorData.message || "Failed to sign the document.");
        setProcessing(false);
        return;
      }

      const blob = await response.blob();
      downloadBlob(blob, `${file.name.replace(/\.[^/.]+$/, "")}-signed.pdf`);

      setSuccessMessage(true);
    } catch {
      setErrorMessage("An error occurred while signing the document.");
    } finally {
      setProcessing(false);
    }
  };

  const isFormValid = mode === "type" ? signatureText.trim().length > 0 : hasDrawn;

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Header — same pattern as the other tool pages, and outside the file
          branch so it stays visible once a document is chosen. */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-card flex items-center justify-center mb-3 text-fg shadow-sm">
          <PenLine className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">Sign PDF Tool</h1>
        <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Add text or drawn signatures with precise positioning.
        </p>
      </div>

      {!file ? (
        <div className="space-y-4">
          <UploadCard
            onFiles={handleFile}
            title="Click to browse or drag & drop a PDF"
            hint="Supports text documents and reports"
          />

          {/* An invalid-file message had nowhere to render before */}
          {errorMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
              {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-fg shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] sm:text-sm font-bold text-fg truncate">{file.name}</p>
                <p className="text-muted text-[11px] sm:text-xs mt-0.5 truncate">
                  Size: <strong className="text-fg">{file.size}</strong> • {numPages}{" "}
                  {numPages === 1 ? "Page" : "Pages"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="p-2 sm:p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0"
              title="Remove file"
            >
              <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>

          {/* Preview & pagination */}
          {numPages > 0 && (
            <div className="space-y-3 bg-[var(--background-secondary)] p-3 sm:p-4 rounded-2xl border border-card">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-muted font-medium">
                <span>
                  Page {currentPage} of {numPages}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 rounded-lg text-xs font-semibold text-[var(--primary-foreground)]"
                  >
                    ← Prev
                  </button>
                  <button
                    type="button"
                    disabled={currentPage >= numPages}
                    onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                    className="px-3 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-40 rounded-lg text-xs font-semibold text-[var(--primary-foreground)]"
                  >
                    Next →
                  </button>
                </div>
              </div>
              <div className="flex justify-center bg-muted rounded-xl p-2 overflow-hidden border border-card">
                <canvas
                  ref={previewCanvasRef}
                  className="rounded shadow max-h-52 sm:max-h-72 max-w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Signature configuration */}
          <div className="bg-[var(--background-secondary)] p-3.5 sm:p-5 rounded-2xl border border-card space-y-4">
            <div className="flex gap-2 bg-muted p-1 rounded-xl border border-card">
              <button
                type="button"
                onClick={() => setMode("type")}
                className={`flex-1 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors ${mode === "type"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow"
                  : "text-[var(--primary)] hover:bg-[var(--secondary)]"
                  }`}
              >
                Type Signature
              </button>
              <button
                type="button"
                onClick={() => setMode("draw")}
                className={`flex-1 py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition-colors ${mode === "draw"
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow"
                  : "text-[var(--primary)] hover:bg-[var(--secondary)]"
                  }`}
              >
                Draw Signature
              </button>
            </div>

            {mode === "type" ? (
              <div>
                <label className="text-xs text-muted block mb-1 font-medium">Your Name / Signature Text</label>
                <input
                  type="text"
                  value={signatureText}
                  onChange={(e) => setSignatureText(e.target.value)}
                  placeholder="e.g. Maniha Iman"
                  className="w-full px-3.5 py-3 sm:py-2.5 rounded-xl border border-card bg-card text-base sm:text-sm text-fg focus:outline-none focus:border-ring"
                />

                {/* Typography and ink for the typed signature. Draw mode has
                    had a colour row all along; typing had neither, so the
                    signature was always the same face, size and colour. */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-muted block mb-1 font-medium">Font</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as FontChoice)}
                      className="w-full px-3 py-3 sm:py-2 rounded-xl border border-card bg-card text-base sm:text-sm text-fg focus:outline-none focus:border-ring"
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-muted block mb-1 font-medium">Size: {fontSize}px</label>
                    <input
                      type="range"
                      min={8}
                      max={48}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full h-6 accent-primary"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted block mb-1.5 font-medium">Ink Colour</label>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {SIGNATURE_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setPenColor(col)}
                          title={col}
                          aria-label={`Ink colour ${col}`}
                          className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 transition-transform shrink-0 ${penColor.toLowerCase() === col.toLowerCase()
                            ? "border-foreground scale-110"
                            : "border-transparent"
                            }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                      <input
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        aria-label="Custom ink colour"
                        className="h-8 w-11 sm:h-7 sm:w-10 rounded-lg border border-card bg-card cursor-pointer p-0.5 shrink-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted">Draw Signature</label>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {/* The same palette the typed mode offers, so switching
                          between them does not change the available inks. */}
                      {SIGNATURE_COLORS.map((col) => (
                        <button
                          key={col}
                          type="button"
                          onClick={() => setPenColor(col)}
                          aria-label={`Ink colour ${col}`}
                          className={`w-5 h-5 sm:w-4 sm:h-4 rounded-full border shrink-0 ${penColor === col ? "border-foreground scale-110" : "border-transparent"
                            }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] underline shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-xl overflow-hidden border border-card flex justify-center p-2">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="cursor-crosshair touch-none bg-white rounded-lg w-full max-w-[340px] h-auto"
                  />
                </div>
                <p className="text-[11px] text-muted text-center">Sign with your finger or mouse inside the box.</p>
              </div>
            )}

            {/* Scope & alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Signing Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignScope("specific")}
                    className={`py-2.5 sm:py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${signScope === "specific"
                      ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--primary)] bg-card text-[var(--primary)] hover:bg-[var(--secondary)]"
                      }`}
                  >
                    Page {currentPage}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignScope("all")}
                    className={`py-2.5 sm:py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${signScope === "all"
                      ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-[var(--primary)] bg-card text-[var(--primary)] hover:bg-[var(--secondary)]"
                      }`}
                  >
                    All Pages
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                  Alignment
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["left", "center", "right"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setPosition(pos)}
                      className={`py-2.5 sm:py-2 px-1 text-[11px] sm:text-xs font-semibold rounded-xl border uppercase tracking-wider transition-all ${position === pos
                        ? "bg-[var(--primary)] border-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-[var(--primary)] bg-card text-[var(--primary)] hover:bg-[var(--secondary)]"
                        }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-[13px] sm:text-sm text-center font-semibold">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[13px] sm:text-sm font-semibold flex items-start sm:items-center justify-center gap-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 sm:mt-0" />
              <span>Document signed and downloaded.</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={clearFile}
              className="w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--secondary)] font-bold text-sm transition-colors"
            >
              Select Different File
            </button>
            <button
              type="button"
              onClick={executeSignAndDownload}
              disabled={!isFormValid || processing}
              title={isFormValid ? undefined : mode === "type" ? "Type your signature first" : "Draw your signature first"}
              className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 rounded-2xl inline-flex items-center justify-center gap-2 text-[var(--primary-foreground)] font-bold text-sm sm:text-base transition-colors shadow-lg bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--primary)]"
            >
              {processing ? (
                <>
                  <Loader2 className="animate-spin shrink-0" size={18} />
                  Signing Document...
                </>
              ) : (
                <>
                  <Download className="shrink-0" size={18} />
                  Download Signed PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}