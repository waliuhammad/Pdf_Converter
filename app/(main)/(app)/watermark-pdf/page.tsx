"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   preview the browser just generated from the file the visitor picked: an
   object URL or a canvas data URL. next/image cannot optimise either, since
   there is no server-side image to resize; it would need unoptimized, which
   renders this same tag inside a wrapper. Disabled for the file rather than
   per line because some of these sit inside ternaries, where a JSX comment is
   a syntax error and the two comment styles would have to be mixed. */


import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Download,
  Type,
  Image as ImageIcon,
  Grid,
  Eye,
  ArrowUpLeft,
  ArrowUp,
  ArrowUpRight,
  ArrowLeft,
  Circle,
  ArrowRight,
  ArrowDownLeft,
  ArrowDown,
  ArrowDownRight,
  Droplets,
  Loader2,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import type * as PdfjsLib from "pdfjs-dist";
import { loadPdfjs } from "@/lib/pdf-libs";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

type Position =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export default function WatermarkPdfPage() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();

  // Watermark Type Options
  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");

  // Text Watermark Configuration
  const [text, setText] = useState("CONFIDENTIAL");
  const [textColor, setTextColor] = useState("#ef4444");
  const [bgColor, setBgColor] = useState("#fee2e2");
  const [useBgColor, setUseBgColor] = useState(true);
  const [fontSize, setFontSize] = useState<number>(42);
  const [isTiled, setIsTiled] = useState(false);

  // Image Watermark Configuration
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(0.3);

  // Layout & Visibility Controls
  const [position, setPosition] = useState<Position>("center");
  const [visibilityMode, setVisibilityMode] = useState<"transparent" | "visible">("transparent");
  const [opacity, setOpacity] = useState<number>(0.35);
  const [rotation] = useState<number>(45);

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  // PDF Preview State
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
  const [renderedPages, setRenderedPages] = useState<{ [pageNumber: number]: string } | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePdfFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (f.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF document.");
      return;
    }

    setRawFile(f);
    setErrorMessage(null);
    setSuccessMessage(false);
    setRenderedPages(null);

    try {
      const arrayBuffer = await f.arrayBuffer();
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
          const upscaleFactor = 4.0;
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
    setRawFile(null);
    setErrorMessage(null);
    setSuccessMessage(false);
    setPdfDoc(null);
    setNumPages(0);
    setRenderedPages(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  const handleImageFile = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const img = fileList[0];
    if (!["image/png", "image/jpeg", "image/jpg"].includes(img.type)) {
      setErrorMessage("Please select a PNG or JPG image.");
      return;
    }
    setWatermarkImage(img);
    setImagePreview(URL.createObjectURL(img));
    setErrorMessage(null);
  };

  const handleVisibilityChange = (mode: "transparent" | "visible") => {
    setVisibilityMode(mode);
    setOpacity(mode === "visible" ? 1.0 : 0.35);
  };

  const executeApplyWatermark = async () => {
    const signal = begin();
    if (!rawFile) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("type", watermarkType);
      formData.append("opacity", opacity.toString());
      formData.append("rotation", rotation.toString());
      formData.append("position", position);

      if (watermarkType === "text") {
        formData.append("text", text);
        formData.append("textColor", textColor);
        formData.append("bgColor", useBgColor ? bgColor : "");
        formData.append("fontSize", fontSize.toString());
        formData.append("isTiled", isTiled.toString());
      } else {
        if (!watermarkImage) {
          setErrorMessage("Please select an image for the watermark.");
          setProcessing(false);
          return;
        }
        formData.append("image", watermarkImage);
        formData.append("imageScale", imageScale.toString());
      }

      const response = await fetch("/api/watermark-pdf", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || "Failed to apply watermark.");
        setProcessing(false);
        return;
      }

      const blob = await response.blob();
      const originalNameWithoutExt = rawFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `${originalNameWithoutExt}_watermarked.pdf`);

      setSuccessMessage(true);
    } catch {
      setErrorMessage("An error occurred while creating the watermark.");
    } finally {
      setProcessing(false);
    }
  };

  const positionsList: { id: Position; label: string; icon: React.ElementType }[] = [
    { id: "top-left", label: "Top Left", icon: ArrowUpLeft },
    { id: "top-center", label: "Top Center", icon: ArrowUp },
    { id: "top-right", label: "Top Right", icon: ArrowUpRight },
    { id: "center-left", label: "Center Left", icon: ArrowLeft },
    { id: "center", label: "Center", icon: Circle },
    { id: "center-right", label: "Center Right", icon: ArrowRight },
    { id: "bottom-left", label: "Bottom Left", icon: ArrowDownLeft },
    { id: "bottom-center", label: "Bottom Center", icon: ArrowDown },
    { id: "bottom-right", label: "Bottom Right", icon: ArrowDownRight },
  ];

  /**
   * The preview overlay used to hardcode items-center justify-center, so
   * choosing any of the nine positions changed the download but never the
   * preview. This maps the selected position to flex alignment; tiled mode
   * stays centered since the tile pattern covers the whole page anyway.
   */
  const previewAlignment: Record<Position, string> = {
    "top-left": "items-start justify-start",
    "top-center": "items-start justify-center",
    "top-right": "items-start justify-end",
    "center-left": "items-center justify-start",
    "center": "items-center justify-center",
    "center-right": "items-center justify-end",
    "bottom-left": "items-end justify-start",
    "bottom-center": "items-end justify-center",
    "bottom-right": "items-end justify-end",
  };

  const overlayAlignment = isTiled && watermarkType === "text"
    ? "items-center justify-center"
    : previewAlignment[position];

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Header — same pattern as the other tool pages */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-card flex items-center justify-center mb-3 text-primary shadow-sm">
          <Droplets className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          PDF Watermark Tool
        </h1>
        <p className="text-muted-foreground text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Add text or image watermarks with precise positioning.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-[13px] sm:text-sm text-center font-semibold">
          {errorMessage}
        </div>
      )}

      {!rawFile ? (
        <UploadCard
          onFiles={handlePdfFile}
          title="Click to browse or drag & drop a PDF"
          hint="Supports text documents and reports"
        />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary — pulled out of the controls column so it stays on
              top when the two columns stack on a phone. */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border bg-accent border-border text-accent-foreground">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{rawFile.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Size: <strong className="text-fg">{formatSize(rawFile.size)}</strong> • {numPages}{" "}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Controls */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4 order-2 lg:order-1">
              {/* Type switcher */}
              <div className="p-1 rounded-2xl border flex gap-1 bg-card border-card shadow-sm">
                <button
                  type="button"
                  onClick={() => setWatermarkType("text")}
                  className={`flex-1 py-3 sm:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${watermarkType === "text"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm border border-[var(--primary)] font-bold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Type size={14} /> Text
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType("image")}
                  className={`flex-1 py-3 sm:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${watermarkType === "image"
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm border border-[var(--primary)] font-bold"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <ImageIcon size={14} /> Image
                </button>
              </div>

              {/* Visibility */}
              <div className="p-3.5 sm:p-4 rounded-2xl border space-y-2 bg-card border-card shadow-sm">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Eye size={13} className="text-primary" /> Visibility Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleVisibilityChange("transparent")}
                    className={`py-2.5 sm:py-2 px-3 rounded-xl text-xs font-medium border transition-all ${visibilityMode === "transparent"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-sm"
                      : "border-card bg-card text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Transparent
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVisibilityChange("visible")}
                    className={`py-2.5 sm:py-2 px-3 rounded-xl text-xs font-medium border transition-all ${visibilityMode === "visible"
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] font-bold shadow-sm"
                      : "border-card bg-card text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    Fully Visible
                  </button>
                </div>
              </div>

              {/* Position grid */}
              {!isTiled && (
                <div className="p-3.5 sm:p-4 rounded-2xl border space-y-2 bg-card border-card shadow-sm">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Grid size={13} className="text-primary" /> Position
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 max-w-[180px] sm:max-w-[160px] mx-auto pt-1">
                    {positionsList.map((pos) => {
                      const Icon = pos.icon;
                      const isActive = position === pos.id;
                      return (
                        <button
                          key={pos.id}
                          type="button"
                          title={pos.label}
                          aria-label={pos.label}
                          onClick={() => setPosition(pos.id)}
                          className={`h-11 sm:h-10 rounded-xl border flex items-center justify-center transition-all ${isActive
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)] shadow-md"
                            : "bg-card border-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <Icon size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Text settings */}
              {watermarkType === "text" && (
                <div className="p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-card border-card shadow-sm">
                  <p className="text-xs font-semibold text-foreground">Text Settings</p>

                  <div>
                    <label className="text-xs block mb-1 text-muted-foreground">Watermark Text</label>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="CONFIDENTIAL"
                      className="w-full p-3 sm:p-2.5 rounded-xl border text-base sm:text-sm focus:outline-none focus:border-primary border-card bg-card text-fg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs block mb-1 text-muted-foreground">Text Color</label>
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-full h-10 sm:h-9 rounded-xl border cursor-pointer p-1 border-card bg-card"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="text-xs block mb-1 text-muted-foreground truncate">
                        Background
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          disabled={!useBgColor}
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          className="w-full min-w-0 h-10 sm:h-9 rounded-xl border cursor-pointer p-1 disabled:opacity-40 border-card bg-card"
                        />
                        <input
                          type="checkbox"
                          aria-label="Use background colour"
                          checked={useBgColor}
                          onChange={(e) => setUseBgColor(e.target.checked)}
                          className="w-4 h-4 shrink-0 accent-primary cursor-pointer rounded"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs block mb-1 text-muted-foreground">
                      Font Size: {fontSize}px
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="96"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full h-6 accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-foreground py-1">
                      <input
                        type="checkbox"
                        checked={isTiled}
                        onChange={(e) => setIsTiled(e.target.checked)}
                        className="w-4 h-4 shrink-0 accent-primary rounded cursor-pointer"
                      />
                      <Grid size={14} className="text-muted-foreground shrink-0" /> Tile pattern across
                      page
                    </label>
                  </div>
                </div>
              )}

              {/* Image settings */}
              {watermarkType === "image" && (
                <div className="p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-card border-card shadow-sm">
                  <p className="text-xs font-semibold text-foreground">Image Settings</p>

                  <div
                    onClick={() => imageInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        imageInputRef.current?.click();
                      }
                    }}
                    className="cursor-pointer border border-dashed rounded-xl p-4 text-center transition-colors border-card hover:border-primary bg-card outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      hidden
                      onChange={(e) => handleImageFile(e.target.files)}
                    />
                    {imagePreview ? (
                      <div className="flex flex-col items-center gap-2">
                        {/* Fixed box: without a width the drop zone resized to
                            whatever shape of logo was picked. */}
                        <img
                          src={imagePreview}
                          alt="Watermark Preview"
                          className="h-16 w-28 sm:w-32 object-contain rounded"
                        />
                        <span className="text-xs text-primary font-medium">Change Image</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <ImageIcon className="mx-auto mb-1 text-muted-foreground" size={20} />
                        Click to upload PNG/JPG logo
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs block mb-1 text-muted-foreground">
                      Image Size: {Math.round(imageScale * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full h-6 accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[13px] font-semibold flex items-start gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>Watermark applied and downloaded.</span>
                </div>
              )}

              <button
                type="button"
                disabled={processing}
                onClick={executeApplyWatermark}
                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl font-bold text-[13px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] border border-[var(--primary)] hover:border-[var(--primary-hover)]"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin shrink-0" size={18} />
                    Applying Watermark...
                  </>
                ) : (
                  <>
                    <Download className="shrink-0" size={18} />
                    Apply &amp; Download PDF
                  </>
                )}
              </button>
            </div>

            {/* Preview — sits first on mobile so the live watermark stays in
                view, and back on the right once the grid splits at lg. */}
            <div className="rounded-2xl border p-4 sm:p-6 pt-10 sm:pt-12 flex flex-col items-center justify-center relative min-h-[320px] sm:min-h-[400px] overflow-hidden lg:col-span-2 bg-card border-card shadow-sm order-1 lg:order-2">
              <div className="absolute top-3 left-4 sm:top-4 text-[11px] sm:text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Droplets size={13} className="text-primary shrink-0" /> Live Preview
              </div>

              {isRendering && !renderedPages && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              )}

              <div className="max-h-[300px] sm:max-h-[380px] w-full max-w-[220px] sm:max-w-[300px] overflow-y-auto flex flex-col items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted border border-card [&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                {renderedPages && Object.keys(renderedPages).length > 0 ? (
                  Object.entries(renderedPages).map(([pageNum, dataUrl]) => (
                    <div key={pageNum} className="relative flex flex-col items-center w-full group">
                      <div className="relative w-full shadow-lg rounded bg-white overflow-hidden border border-border">
                        <img src={dataUrl} alt={`Page ${pageNum}`} className="w-full h-auto object-contain block" />
                        {/* Live watermark overlay. Alignment follows the
                            selected position (it used to hardcode center, so
                            the grid changed the download but not the
                            preview); p-3 keeps edge positions off the page
                            border like the server-side margin does. */}
                        <div
                          className={`absolute inset-0 flex p-2 sm:p-3 ${overlayAlignment} pointer-events-none overflow-hidden`}
                        >
                          {watermarkType === "text" ? (
                            <div
                              className="font-bold select-none text-center"
                              style={{
                                color: textColor,
                                opacity: opacity,
                                fontSize: `${fontSize * 0.45}px`,
                                transform: `rotate(${rotation}deg)`,
                                backgroundColor: useBgColor ? bgColor : "transparent",
                                padding: useBgColor ? "2px 6px" : undefined,
                              }}
                            >
                              {text || "WATERMARK"}
                            </div>
                          ) : imagePreview ? (
                            <img
                              src={imagePreview}
                              alt="Watermark"
                              className="select-none object-contain max-w-full"
                              style={{
                                opacity: opacity,
                                width: `${imageScale * 120}px`,
                                transform: `rotate(${rotation}deg)`,
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">Page {pageNum}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-40 sm:h-48 flex items-center justify-center">
                    <Loader2 className="animate-spin text-primary" size={28} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}