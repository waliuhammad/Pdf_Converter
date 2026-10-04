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
  Droplets,
  Loader2,
  Trash2,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  Layers,
  RotateCcw,
  LayoutGrid,
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

type FontFamily = "helvetica" | "times" | "courier";

const POSITIONS: Position[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

const FONTS: { id: FontFamily; label: string; css: string }[] = [
  { id: "helvetica", label: "Helvetica", css: "Helvetica, Arial, sans-serif" },
  { id: "times", label: "Times", css: "'Times New Roman', Times, serif" },
  { id: "courier", label: "Courier", css: "'Courier New', Courier, monospace" },
];

/** Transparency, as the share of the watermark that shows through. */
const TRANSPARENCIES = [
  { value: 0, label: "None" },
  { value: 0.25, label: "25%" },
  { value: 0.5, label: "50%" },
  { value: 0.75, label: "75%" },
];

const ROTATIONS = [0, 45, 90, 180, 270];

/** Mirrors MARGIN in lib/watermark.ts, so the preview sits where the stamp will. */
const MARGIN_PT = 36;

interface RenderedPage {
  url: string;
  /** Width in PDF points, as displayed, for sizing the preview overlay. */
  widthPt: number;
}

function chipClass(active: boolean): string {
  return `rounded-xl border text-xs font-semibold transition-all ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  }`;
}

export default function WatermarkPdfPage() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();

  const [watermarkType, setWatermarkType] = useState<"text" | "image">("text");

  // Text
  const [text, setText] = useState("CONFIDENTIAL");
  const [font, setFont] = useState<FontFamily>("helvetica");
  const [fontSize, setFontSize] = useState<number>(48);
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [underline, setUnderline] = useState(false);
  const [textColor, setTextColor] = useState("#ef4444");
  const [useBgColor, setUseBgColor] = useState(false);
  const [bgColor, setBgColor] = useState("#fee2e2");

  // Image
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState<number>(0.3);

  // Placement and appearance
  const [position, setPosition] = useState<Position>("center");
  const [mosaic, setMosaic] = useState(false);
  const [transparency, setTransparency] = useState<number>(0.5);
  const [rotation, setRotation] = useState<number>(45);
  const [layer, setLayer] = useState<"over" | "below">("over");
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("1");

  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState(false);

  const [numPages, setNumPages] = useState<number>(0);
  const [pdfDoc, setPdfDoc] = useState<PdfjsLib.PDFDocumentProxy | null>(null);
  const [renderedPages, setRenderedPages] = useState<Record<number, RenderedPage> | null>(null);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const opacity = 1 - transparency;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handlePdfFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
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
      const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      setPdfDoc(loadedPdf);
      setNumPages(loadedPdf.numPages);
      setFromPage("1");
      setToPage(String(loadedPdf.numPages));
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
      const pagesMap: Record<number, RenderedPage> = {};

      try {
        for (let i = 1; i <= numPages; i++) {
          if (isCancelled) break;
          const page = await pdfDoc.getPage(i);
          const viewport = page.getViewport({ scale: 0.6 });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: context, viewport }).promise;

          pagesMap[i] = { url: canvas.toDataURL(), widthPt: page.getViewport({ scale: 1 }).width };
        }

        if (!isCancelled) setRenderedPages(pagesMap);
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
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setWatermarkImage(img);
    setImagePreview(URL.createObjectURL(img));
    setErrorMessage(null);
  };

  const rangeFrom = Math.min(Math.max(1, parseInt(fromPage, 10) || 1), Math.max(1, numPages));
  const rangeTo = Math.min(Math.max(rangeFrom, parseInt(toPage, 10) || numPages), Math.max(1, numPages));

  const executeApplyWatermark = async () => {
    if (!rawFile) return;

    if (watermarkType === "text" && !text.trim()) {
      setErrorMessage("Enter the watermark text.");
      return;
    }
    if (watermarkType === "image" && !watermarkImage) {
      setErrorMessage("Please select an image for the watermark.");
      return;
    }

    const signal = begin();
    setProcessing(true);
    setErrorMessage(null);
    setSuccessMessage(false);

    try {
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("type", watermarkType);
      formData.append("position", position);
      formData.append("mosaic", String(mosaic));
      formData.append("opacity", opacity.toString());
      formData.append("rotation", rotation.toString());
      formData.append("layer", layer);
      formData.append("fromPage", String(rangeFrom));
      formData.append("toPage", String(rangeTo));

      if (watermarkType === "text") {
        formData.append("text", text);
        formData.append("font", font);
        formData.append("fontSize", fontSize.toString());
        formData.append("bold", String(bold));
        formData.append("italic", String(italic));
        formData.append("underline", String(underline));
        formData.append("textColor", textColor);
        formData.append("bgColor", useBgColor ? bgColor : "");
      } else if (watermarkImage) {
        formData.append("image", watermarkImage);
        formData.append("imageScale", imageScale.toString());
      }

      const response = await fetch("/api/watermark-pdf", { method: "POST", body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || errorData.message || "Failed to apply watermark.");
        return;
      }

      const blob = await response.blob();
      const originalNameWithoutExt = rawFile.name.replace(/\.[^/.]+$/, "");
      downloadBlob(blob, `${originalNameWithoutExt}_watermarked.pdf`);
      setSuccessMessage(true);
    } catch (err) {
      if (wasCancelled(err)) return;
      setErrorMessage("An error occurred while creating the watermark.");
    } finally {
      setProcessing(false);
    }
  };

  const previewAlignment: Record<Position, string> = {
    "top-left": "items-start justify-start",
    "top-center": "items-start justify-center",
    "top-right": "items-start justify-end",
    "center-left": "items-center justify-start",
    center: "items-center justify-center",
    "center-right": "items-center justify-end",
    "bottom-left": "items-end justify-start",
    "bottom-center": "items-end justify-center",
    "bottom-right": "items-end justify-end",
  };

  const fontCss = FONTS.find((f) => f.id === font)?.css ?? FONTS[0].css;

  /** One stamp, sized in container units so it scales with the thumbnail. */
  const renderStamp = (widthPt: number, key?: number) => {
    // CSS rotates clockwise; the PDF rotation is counter-clockwise.
    const transform = `rotate(${-rotation}deg)`;
    if (watermarkType === "text") {
      return (
        <div
          key={key}
          className="select-none whitespace-nowrap shrink-0"
          style={{
            color: textColor,
            opacity,
            fontFamily: fontCss,
            fontSize: `${(fontSize / widthPt) * 100}cqw`,
            lineHeight: 1.1,
            fontWeight: bold ? 700 : 400,
            fontStyle: italic ? "italic" : "normal",
            textDecoration: underline ? "underline" : "none",
            transform,
            backgroundColor: useBgColor ? bgColor : "transparent",
            padding: useBgColor ? "0 0.25em" : undefined,
          }}
        >
          {text || "WATERMARK"}
        </div>
      );
    }
    if (!imagePreview) return null;
    return (
      <img
        key={key}
        src={imagePreview}
        alt=""
        className="select-none object-contain shrink-0"
        style={{ opacity, width: `${imageScale * 100}cqw`, transform }}
      />
    );
  };

  const inputClass =
    "w-full p-2.5 rounded-xl border text-base sm:text-sm focus:outline-none focus:border-primary border-border bg-background text-foreground";

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center mb-3 text-primary shadow-sm">
          <Droplets className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight px-2">
          PDF Watermark Tool
        </h1>
        <p className="text-muted-foreground text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Stamp text or an image over your PDF — choose the font, position, transparency, rotation, layer and pages.
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
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 border bg-accent border-border text-accent-foreground">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-[13px] sm:text-sm font-bold truncate">{rawFile.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Size: <strong className="text-foreground">{formatSize(rawFile.size)}</strong> • {numPages}{" "}
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
              <div className="p-1 rounded-2xl border flex gap-1 bg-card border-border shadow-sm">
                {(["text", "image"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWatermarkType(t)}
                    className={`flex-1 py-3 sm:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      watermarkType === t
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "text" ? <Type size={14} /> : <ImageIcon size={14} />}
                    {t === "text" ? "Place text" : "Place image"}
                  </button>
                ))}
              </div>

              {watermarkType === "text" && (
                <div className="p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-card border-border shadow-sm">
                  <p className="text-xs font-semibold text-foreground">Text</p>
                  <input
                    type="text"
                    value={text}
                    maxLength={200}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="CONFIDENTIAL"
                    aria-label="Watermark text"
                    className={inputClass}
                  />

                  <div className="grid grid-cols-3 gap-1.5">
                    {FONTS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFont(f.id)}
                        className={`py-2 ${chipClass(font === f.id)}`}
                        style={{ fontFamily: f.css }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[
                      { on: bold, set: setBold, icon: Bold, label: "Bold" },
                      { on: italic, set: setItalic, icon: Italic, label: "Italic" },
                      { on: underline, set: setUnderline, icon: Underline, label: "Underline" },
                    ].map(({ on, set, icon: Icon, label }) => (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        aria-label={label}
                        aria-pressed={on}
                        onClick={() => set(!on)}
                        className={`h-9 w-9 flex items-center justify-center ${chipClass(on)}`}
                      >
                        <Icon size={15} />
                      </button>
                    ))}
                    <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground" title="Text colour">
                      Colour
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border cursor-pointer p-0.5 border-border bg-background"
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-xs block mb-1 text-muted-foreground">Font size: {fontSize} pt</label>
                    <input
                      type="range"
                      min="8"
                      max="144"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full h-6 accent-primary cursor-pointer"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-foreground">
                    <input
                      type="checkbox"
                      checked={useBgColor}
                      onChange={(e) => setUseBgColor(e.target.checked)}
                      className="w-4 h-4 shrink-0 accent-primary rounded cursor-pointer"
                    />
                    Background colour
                    <input
                      type="color"
                      disabled={!useBgColor}
                      value={bgColor}
                      aria-label="Background colour"
                      onChange={(e) => setBgColor(e.target.value)}
                      className="ml-auto w-9 h-9 rounded-lg border cursor-pointer p-0.5 disabled:opacity-40 border-border bg-background"
                    />
                  </label>
                </div>
              )}

              {watermarkType === "image" && (
                <div className="p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-card border-border shadow-sm">
                  <p className="text-xs font-semibold text-foreground">Image</p>
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
                    className="cursor-pointer border border-dashed rounded-xl p-4 text-center transition-colors border-border hover:border-primary bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <img src={imagePreview} alt="Watermark" className="h-16 w-28 sm:w-32 object-contain rounded" />
                        <span className="text-xs text-primary font-medium">Change image</span>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        <ImageIcon className="mx-auto mb-1 text-muted-foreground" size={20} />
                        Click to add a PNG or JPG
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs block mb-1 text-muted-foreground">
                      Image width: {Math.round(imageScale * 100)}% of the page
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={imageScale}
                      onChange={(e) => setImageScale(Number(e.target.value))}
                      className="w-full h-6 accent-primary cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Position: 3x3 grid or mosaic */}
              <div className="p-3.5 sm:p-4 rounded-2xl border space-y-2 bg-card border-border shadow-sm">
                <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Grid size={13} className="text-primary" /> Position
                </label>
                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="grid grid-cols-3 gap-1.5 w-[132px]">
                    {POSITIONS.map((pos) => {
                      const isActive = !mosaic && position === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          title={pos.replace("-", " ")}
                          aria-label={pos.replace("-", " ")}
                          aria-pressed={isActive}
                          onClick={() => {
                            setPosition(pos);
                            setMosaic(false);
                          }}
                          className={`h-10 rounded-lg border flex items-center justify-center transition-all ${
                            isActive
                              ? "bg-primary border-primary shadow-sm"
                              : "bg-background border-border hover:bg-accent"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${isActive ? "bg-primary-foreground" : "bg-muted-foreground/40"}`}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMosaic(!mosaic)}
                    aria-pressed={mosaic}
                    className={`flex flex-col items-center gap-1 px-3 py-3 ${chipClass(mosaic)}`}
                  >
                    <LayoutGrid size={18} />
                    Mosaic
                  </button>
                </div>
              </div>

              {/* Appearance */}
              <div className="p-3.5 sm:p-4 rounded-2xl border space-y-3 bg-card border-border shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Eye size={13} className="text-primary" /> Transparency
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TRANSPARENCIES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setTransparency(t.value)}
                        className={`py-2 ${chipClass(transparency === t.value)}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <RotateCcw size={13} className="text-primary" /> Rotation
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {ROTATIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRotation(r)}
                        className={`py-2 ${chipClass(rotation === r)}`}
                        title={r === 0 ? "Do not rotate" : `${r} degrees`}
                      >
                        {r}°
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Layers size={13} className="text-primary" /> Layer
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setLayer("over")} className={`py-2 ${chipClass(layer === "over")}`}>
                      Over PDF content
                    </button>
                    <button type="button" onClick={() => setLayer("below")} className={`py-2 ${chipClass(layer === "below")}`}>
                      Below PDF content
                    </button>
                  </div>
                  {layer === "below" && (
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      The page is drawn on top of the watermark. On scanned pages, or pages with a solid
                      background, it will be hidden.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Pages</label>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    from
                    <input
                      type="number"
                      min={1}
                      max={numPages || 1}
                      value={fromPage}
                      onChange={(e) => setFromPage(e.target.value)}
                      aria-label="From page"
                      className="w-full min-w-0 px-2.5 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    />
                    to
                    <input
                      type="number"
                      min={1}
                      max={numPages || 1}
                      value={toPage}
                      onChange={(e) => setToPage(e.target.value)}
                      aria-label="To page"
                      className="w-full min-w-0 px-2.5 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

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
                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl font-bold text-[13px] sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 bg-primary hover:opacity-90 text-primary-foreground border border-primary"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin shrink-0" size={18} />
                    Applying Watermark...
                  </>
                ) : (
                  <>
                    <Download className="shrink-0" size={18} />
                    Add watermark &amp; download
                  </>
                )}
              </button>
            </div>

            {/* Preview */}
            <div className="rounded-2xl border p-4 sm:p-6 pt-10 sm:pt-12 flex flex-col items-center justify-center relative min-h-[320px] sm:min-h-[400px] overflow-hidden lg:col-span-2 bg-card border-border shadow-sm order-1 lg:order-2">
              <div className="absolute top-3 left-4 sm:top-4 text-[11px] sm:text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Droplets size={13} className="text-primary shrink-0" /> Live Preview
              </div>

              {isRendering && !renderedPages && (
                <div className="absolute inset-0 bg-background/40 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              )}

              <div className="max-h-[300px] sm:max-h-[520px] w-full max-w-[220px] sm:max-w-[340px] overflow-y-auto flex flex-col items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-muted border border-border [&::-webkit-scrollbar]:w-1.5 sm:[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-primary/30 [&::-webkit-scrollbar-thumb]:rounded-full">
                {renderedPages && Object.keys(renderedPages).length > 0 ? (
                  Object.entries(renderedPages).map(([pageNum, page]) => {
                    const n = Number(pageNum);
                    const inRange = n >= rangeFrom && n <= rangeTo;
                    return (
                      <div key={pageNum} className="relative flex flex-col items-center w-full">
                        {/* Page thumbnails stay white: they are pictures of paper. */}
                        <div
                          className="relative w-full shadow-lg rounded bg-white overflow-hidden border border-border"
                          style={{ containerType: "inline-size" }}
                        >
                          <img src={page.url} alt={`Page ${pageNum}`} className="w-full h-auto object-contain block" />
                          {inRange &&
                            (mosaic ? (
                              <div
                                className={`absolute inset-0 pointer-events-none overflow-hidden flex flex-wrap content-center justify-center ${
                                  layer === "below" ? "mix-blend-multiply" : ""
                                }`}
                                style={{ gap: `${(24 / page.widthPt) * 100}cqw` }}
                              >
                                {Array.from({ length: 24 }, (_, i) => renderStamp(page.widthPt, i))}
                              </div>
                            ) : (
                              <div
                                className={`absolute inset-0 flex ${previewAlignment[position]} pointer-events-none overflow-hidden ${
                                  layer === "below" ? "mix-blend-multiply" : ""
                                }`}
                                style={{ padding: `${(MARGIN_PT / page.widthPt) * 100}cqw` }}
                              >
                                {renderStamp(page.widthPt)}
                              </div>
                            ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1">
                          Page {pageNum}
                          {inRange ? "" : " · no watermark"}
                        </span>
                      </div>
                    );
                  })
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
