"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, X, Download, Loader2, Type, Bold, Italic, Pencil, Trash2, ChevronLeft, ChevronRight, Eraser, Move, Sparkles } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import type * as PdfjsLib from "pdfjs-dist";
import { downloadBlob } from "@/lib/download";
import { loadPdfjs } from "@/lib/pdf-libs";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

interface TextAnnotation {
  id: string;
  type: "text";
  text: string;
  x: number;
  y: number;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  pageIndex: number;
}

interface ReplaceAnnotation {
  id: string;
  type: "replace";
  x: number;
  y: number;
  width: number;
  height: number;
  newText: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  color: string;
  pageIndex: number;
}

interface DrawAnnotation {
  id: string;
  type: "draw";
  path: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  pageIndex: number;
}

type Annotation = TextAnnotation | ReplaceAnnotation | DrawAnnotation;

/** Swatches beside the native pickers: the tiny OS colour chip is easy to
 *  miss and fiddly on phones; one tap on a swatch is unambiguous. */
// #4f46e5 is the drawing tool's starting colour. Without it in the row the
// palette opened with nothing marked, so it read as having picked nothing.
const COLOR_SWATCHES = [
  "#000000",
  "#dc2626",
  "#2563eb",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#4f46e5",
];

export default function EditPdfPage() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [pdfDocProxy, setPdfDocProxy] = useState<PdfjsLib.PDFDocumentProxy | null>(null);

  // Active Tool Mode
  const [activeTool, setActiveTool] = useState<"text" | "replace" | "draw">("replace");

  // Text Options (Default Text Color set to #000000)
  const [newText, setNewText] = useState("");
  const [fontSize, setFontSize] = useState<number>(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textColor, setTextColor] = useState("#000000");

  // Replace Text Tool Options
  const [replaceWidth, setReplaceWidth] = useState(120);
  const [replaceHeight, setReplaceHeight] = useState(22);

  // Draw Options
  const [drawColor, setDrawColor] = useState("#4f46e5");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);

  // Selection & Drag State for Elements
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draggingAnnId, setDraggingAnnId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  // Annotations Store
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * The scale the current page is rendered at. Previously hardcoded to 1.2,
   * which caused both visible problems: an A4 page became ~714px wide (too
   * large to fit beside the tools, so the preview scrolled and left no room
   * to work), and — worse — annotations were saved to the server in these
   * scaled pixels while the server draws in PDF points, so everything in the
   * downloaded file sat ~20% away from where the preview showed it. The
   * page now renders at whatever scale fits the preview box, and executeSave
   * divides everything by this before sending.
   */
  const [renderScale, setRenderScale] = useState(1);
  const [resizeTick, setResizeTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayContainerRef = useRef<HTMLDivElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);

  // Re-fit the page when the window changes size (rotating a phone, resizing
  // a desktop window). Debounced by rAF-ish timeout; the tick re-runs render.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setResizeTick((t) => t + 1), 200);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFile = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const f = fileList[0];
    if (f.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF file.");
      return;
    }

    try {
      const arrayBuffer = await f.arrayBuffer();

      // pdf.js is fetched here, when a file is chosen, rather than injected
      // from a CDN as soon as the page opened: visitors who never pick a file
      // no longer download it, and a file picked before that script finished
      // loading is no longer silently skipped with no preview.
      const pdfjsLib = await loadPdfjs();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDocProxy(pdf);
      setPageCount(pdf.numPages);

      setRawFile(f);
      setFileDetails({ name: f.name, size: formatSize(f.size) });
      setSelectedPageIndex(0);
      setAnnotations([]);
      setErrorMessage(null);
    } catch (err) {
      if (wasCancelled(err)) return;
      console.error("Error loading PDF:", err);
      setErrorMessage("Could not render PDF document.");
    }
  };

  useEffect(() => {
    if (!pdfDocProxy || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocProxy.getPage(selectedPageIndex + 1);
        const canvas = canvasRef.current;
        if (!canvas) return;

        // getContext returns null when the canvas already has a context of a
        // different kind, or when the tab is out of memory. This was passed to
        // page.render() unchecked; typing pdfDocProxy properly is what surfaced
        // it, because `any` accepted the null happily.
        const context = canvas.getContext("2d");
        if (!context) return;

        // Fit the page to the preview box instead of a fixed 1.2: measured
        // fresh on every render so page flips and window resizes both refit.
        const base = page.getViewport({ scale: 1 });
        const boxWidth = previewBoxRef.current?.clientWidth ?? base.width;
        const scale = Math.min(Math.max((boxWidth - 8) / base.width, 0.4), 1.5);
        setRenderScale(scale);

        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
      if (wasCancelled(err)) return;
        console.error("Canvas render error:", err);
      }
    };

    renderPage();
  }, [pdfDocProxy, selectedPageIndex, resizeTick]);

  const pointFromEvent = useCallback((e: { clientX: number; clientY: number }, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingAnnId || hasDragged || activeTool === "draw") {
      setHasDragged(false);
      return;
    }

    const { x: rawX, y: rawY } = pointFromEvent(e, e.currentTarget);
    const x = Math.round(rawX);
    const y = Math.round(rawY);

    const textToAdd = newText.trim() || "Add text here...";

    if (activeTool === "replace") {
      const ann: ReplaceAnnotation = {
        id: Math.random().toString(36).substring(2, 9),
        type: "replace",
        x: x - replaceWidth / 2 > 0 ? x - replaceWidth / 2 : x,
        y: y - replaceHeight / 2 > 0 ? y - replaceHeight / 2 : y,
        width: replaceWidth,
        height: replaceHeight,
        newText: textToAdd,
        fontSize,
        isBold,
        isItalic,
        color: textColor,
        pageIndex: selectedPageIndex,
      };
      setAnnotations((prev) => [...prev, ann]);
      setSelectedAnnotationId(ann.id);
    } else if (activeTool === "text") {
      const ann: TextAnnotation = {
        id: Math.random().toString(36).substring(2, 9),
        type: "text",
        text: textToAdd,
        x,
        y,
        fontSize,
        isBold,
        isItalic,
        color: textColor,
        pageIndex: selectedPageIndex,
      };
      setAnnotations((prev) => [...prev, ann]);
      setSelectedAnnotationId(ann.id);
    }
  };

  // Pointer events unify mouse and touch, so dragging placed elements and
  // freehand drawing work on phones — the previous mouse-only handlers meant
  // the draw tool did nothing at all on a touch screen.
  const startDragAnnotation = (e: React.PointerEvent, id: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setSelectedAnnotationId(id);
    setDraggingAnnId(id);
    setHasDragged(false);

    if (overlayContainerRef.current) {
      const { x: mouseX, y: mouseY } = pointFromEvent(e, overlayContainerRef.current);
      setDragOffset({ x: mouseX - currentX, y: mouseY - currentY });
    }
  };

  const onPointerMoveContainer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDrawing && activeTool === "draw") {
      const { x, y } = pointFromEvent(e, e.currentTarget);
      setCurrentPath((prev) => [...prev, { x, y }]);
      return;
    }

    if (!draggingAnnId || !overlayContainerRef.current) return;

    setHasDragged(true);
    const { x: mouseX, y: mouseY } = pointFromEvent(e, overlayContainerRef.current);

    const newX = Math.round(mouseX - dragOffset.x);
    const newY = Math.round(mouseY - dragOffset.y);

    setAnnotations((prev) =>
      prev.map((ann) => {
        if (ann.id === draggingAnnId) {
          return { ...ann, x: newX, y: newY } as Annotation;
        }
        return ann;
      })
    );
  };

  const onPointerUpContainer = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (currentPath.length > 1) {
        const ann: DrawAnnotation = {
          id: Math.random().toString(36).substring(2, 9),
          type: "draw",
          path: currentPath,
          color: drawColor,
          strokeWidth,
          pageIndex: selectedPageIndex,
        };
        setAnnotations((prev) => [...prev, ann]);
      }
      setCurrentPath([]);
    }
    setDraggingAnnId(null);
  };

  const startDrawing = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== "draw") return;
    const { x, y } = pointFromEvent(e, e.currentTarget);

    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const removeAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const selectedAnn = annotations.find((a) => a.id === selectedAnnotationId);
  const selectedTextAnn = selectedAnn && selectedAnn.type !== "draw" ? (selectedAnn as TextAnnotation | ReplaceAnnotation) : null;

  // Annotations hold text and colours (string), sizes (number), and the bold
  // and italic toggles (boolean) — that union is the whole set.
  const updateSelectedAnnotation = (field: string, value: string | number | boolean) => {
    if (!selectedAnnotationId) return;
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id === selectedAnnotationId) {
          return { ...a, [field]: value } as Annotation;
        }
        return a;
      })
    );
  };

  const executeSave = async () => {
    const signal = begin();
    if (!rawFile) return;
    setProcessing(true);
    setErrorMessage(null);

    try {
      // The preview works in canvas pixels at renderScale; the server draws
      // in PDF points. Dividing everything by the scale here is what makes
      // the downloaded file match the preview — previously the raw scaled
      // pixels were sent, landing every edit ~20% off.
      const s = renderScale || 1;
      const scaled = annotations.map((a) => {
        if (a.type === "draw") {
          return {
            ...a,
            path: a.path.map((p) => ({ x: p.x / s, y: p.y / s })),
            strokeWidth: a.strokeWidth / s,
          };
        }
        if (a.type === "replace") {
          return {
            ...a,
            x: a.x / s,
            y: a.y / s,
            width: a.width / s,
            height: a.height / s,
            fontSize: a.fontSize / s,
          };
        }
        return { ...a, x: a.x / s, y: a.y / s, fontSize: a.fontSize / s };
      });

      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("annotations", JSON.stringify(scaled));

      const response = await fetch("/api/edit-pdf", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || errorData.message || "Failed to save edited PDF.");
        setProcessing(false);
        return;
      }

      const blob = await response.blob();
      downloadBlob(blob, `edited_${rawFile.name}`);
    } catch {
      setErrorMessage("An error occurred while saving the document.");
    } finally {
      setProcessing(false);
    }
  };

  const swatchRow = (current: string, apply: (hex: string) => void) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      {COLOR_SWATCHES.map((hex) => (
        <button
          key={hex}
          type="button"
          onClick={() => apply(hex)}
          // Both sides lowered: a colour arriving from the native picker or from
          // a saved annotation can be upper case, and only one side was.
          className={`w-6 h-6 rounded-full border-2 transition-transform ${current.toLowerCase() === hex.toLowerCase()
            ? "border-foreground scale-110"
            : "border-transparent"
            }`}
          style={{ backgroundColor: hex }}
          title={hex}
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto w-full text-fg px-4 sm:px-6">
      {!fileDetails ? (
        <div className="max-w-4xl mx-auto">
          {/* Header Section — plain text, no card */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-muted border border-border text-fg text-xs font-semibold mb-3 sm:mb-4 shadow-sm">
              <Sparkles size={13} className="text-foreground" />
              DOCUMENT CONVERSION SUITE
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-fg tracking-tight mb-1.5 sm:mb-2">Pro Interactive PDF Editor</h1>
            <p className="text-muted text-xs sm:text-sm px-2 max-w-lg mx-auto">Add text, replace content, or draw with precise positioning.</p>
          </div>

          <UploadCard
            onFiles={handleFile}
            title="Click to browse or drag & drop a PDF"
            hint="Supports text documents and reports"
          />

          {errorMessage && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs text-center">
              {errorMessage}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-3 p-4 sm:p-5 rounded-xl bg-card border border-card shadow-lg transition-colors">
              <div className="w-9 h-9 rounded-lg bg-[var(--background-secondary)] border border-card flex items-center justify-center shrink-0">
                <FileText size={16} className="text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-fg text-sm truncate font-medium">{fileDetails.name}</p>
                <p className="text-muted text-xs">{fileDetails.size} • {pageCount} pages</p>
              </div>
              <button onClick={() => { cancel(); setFileDetails(null); setRawFile(null); setAnnotations([]); setPdfDocProxy(null); }} className="text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-1.5 rounded-xl bg-card border border-card flex gap-1 shadow-lg transition-colors">
              <button
                type="button"
                onClick={() => setActiveTool("replace")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTool === "replace" ? "bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] shadow-md" : "text-[var(--primary)] hover:bg-[var(--secondary)]"
                  }`}
              >
                <Eraser size={13} /> Edit/Replace
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("text")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTool === "text" ? "bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] shadow-md" : "text-[var(--primary)] hover:bg-[var(--secondary)]"
                  }`}
              >
                <Type size={13} /> Add Text
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("draw")}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${activeTool === "draw" ? "bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] shadow-md" : "text-[var(--primary)] hover:bg-[var(--secondary)]"
                  }`}
              >
                <Pencil size={13} /> Draw
              </button>
            </div>

            {(activeTool === "replace" || activeTool === "text") && (
              <div className="p-4 rounded-2xl bg-card border border-card space-y-3 shadow-lg transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-fg">Text Properties</p>
                  {selectedTextAnn && (
                    <span className="text-[10px] text-muted font-semibold flex items-center gap-1 bg-[var(--background-secondary)] px-2 py-0.5 rounded-full border border-card">
                      <Move size={10} /> Active Selected
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Text Content</label>
                  <input
                    type="text"
                    value={
                      selectedTextAnn
                        ? "newText" in selectedTextAnn
                          ? selectedTextAnn.newText
                          : selectedTextAnn.text
                        : newText
                    }
                    onChange={(e) => {
                      setNewText(e.target.value);
                      if (selectedTextAnn) {
                        updateSelectedAnnotation(
                          "newText" in selectedTextAnn ? "newText" : "text",
                          e.target.value
                        );
                      }
                    }}
                    placeholder="Write text here..."
                    className="w-full p-2.5 rounded-xl border border-card bg-card text-fg text-sm focus:outline-none focus:border-ring transition-colors"
                  />
                </div>

                {activeTool === "replace" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted block mb-1">Whiteout Width</label>
                      <input
                        type="number"
                        value={
                          selectedTextAnn && "width" in selectedTextAnn
                            ? selectedTextAnn.width
                            : replaceWidth
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReplaceWidth(val);
                          updateSelectedAnnotation("width", val);
                        }}
                        className="w-full p-2 rounded-xl border border-card bg-card text-fg text-xs focus:outline-none focus:border-ring"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Whiteout Height</label>
                      <input
                        type="number"
                        value={
                          selectedTextAnn && "height" in selectedTextAnn
                            ? selectedTextAnn.height
                            : replaceHeight
                        }
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setReplaceHeight(val);
                          updateSelectedAnnotation("height", val);
                        }}
                        className="w-full p-2 rounded-xl border border-card bg-card text-fg text-xs focus:outline-none focus:border-ring"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedTextAnn ? !selectedTextAnn.isBold : !isBold;
                      setIsBold(next);
                      updateSelectedAnnotation("isBold", next);
                    }}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center flex-1 transition-all ${(selectedTextAnn ? selectedTextAnn.isBold : isBold)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-card bg-card text-[var(--primary)] hover:border-[var(--primary)]"
                      }`}
                  >
                    <Bold size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = selectedTextAnn ? !selectedTextAnn.isItalic : !isItalic;
                      setIsItalic(next);
                      updateSelectedAnnotation("isItalic", next);
                    }}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center flex-1 transition-all ${(selectedTextAnn ? selectedTextAnn.isItalic : isItalic)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : "border-card bg-card text-[var(--primary)] hover:border-[var(--primary)]"
                      }`}
                  >
                    <Italic size={14} />
                  </button>
                  <input
                    type="color"
                    value={selectedTextAnn ? selectedTextAnn.color : textColor}
                    onChange={(e) => {
                      setTextColor(e.target.value);
                      updateSelectedAnnotation("color", e.target.value);
                    }}
                    className="h-8 w-12 rounded-lg border border-card cursor-pointer bg-card p-0.5"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">Quick Colors</label>
                  {swatchRow(selectedTextAnn ? selectedTextAnn.color : textColor, (hex) => {
                    setTextColor(hex);
                    updateSelectedAnnotation("color", hex);
                  })}
                </div>

                <div>
                  <label className="text-xs text-muted block mb-1">
                    Font Size: {selectedTextAnn ? selectedTextAnn.fontSize : fontSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="48"
                    value={selectedTextAnn ? selectedTextAnn.fontSize : fontSize}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFontSize(val);
                      updateSelectedAnnotation("fontSize", val);
                    }}
                    className="w-full accent-[var(--primary)] cursor-pointer bg-[var(--secondary)] rounded-lg h-2"
                  />
                </div>
              </div>
            )}

            {activeTool === "draw" && (
              <div className="p-4 rounded-2xl bg-card border border-card space-y-3 shadow-lg transition-colors">
                <p className="text-xs font-semibold text-fg">Drawing Properties</p>
                <div>
                  <label className="text-xs text-muted block mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={drawColor}
                      onChange={(e) => setDrawColor(e.target.value)}
                      className="h-9 w-14 rounded-xl border border-card cursor-pointer bg-card p-1 shrink-0"
                    />
                    {swatchRow(drawColor, setDrawColor)}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted block mb-1">Stroke Width: {strokeWidth}px</label>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full accent-[var(--primary)] cursor-pointer bg-[var(--secondary)] rounded-lg h-2"
                  />
                </div>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-card border border-card space-y-2 shadow-lg transition-colors">
              <p className="text-xs font-semibold text-fg">Active Modifications ({annotations.length})</p>
              {annotations.length === 0 ? (
                <p className="text-xs text-muted">No edits made yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      onClick={() => setSelectedAnnotationId(ann.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${selectedAnnotationId === ann.id
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]"
                        : "bg-card border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--secondary)]"
                        }`}
                    >
                      <span className="truncate pr-2 font-medium">
                        P{ann.pageIndex + 1}: {ann.type === "replace" ? `Replace → "${ann.newText}"` : ann.type === "text" ? `Text: "${ann.text}"` : "Draw Stroke"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeAnnotation(ann.id);
                        }}
                        className={`text-[var(--primary)] hover:text-[var(--primary-hover)] ${selectedAnnotationId === ann.id ? "text-[var(--primary-foreground)]" : ""}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errorMessage && fileDetails && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={executeSave}
              disabled={processing || annotations.length === 0}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] font-medium hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg text-sm"
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Save & Download PDF
                </>
              )}
            </button>
          </div>

          <div className="lg:col-span-2 flex flex-col items-center bg-card p-3 sm:p-4 rounded-2xl border border-card shadow-xl transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-3 px-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={selectedPageIndex === 0}
                  onClick={() => setSelectedPageIndex((p) => Math.max(0, p - 1))}
                  className="p-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] disabled:opacity-40 hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-muted font-medium">
                  Page {selectedPageIndex + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={selectedPageIndex >= pageCount - 1}
                  onClick={() => setSelectedPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                  className="p-1.5 rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)] disabled:opacity-40 hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <span className="text-[11px] text-muted">
                {activeTool === "draw" ? "Click & drag to draw" : "Click anywhere on page to place"}
              </span>
            </div>

            <div ref={previewBoxRef} className="relative border border-card bg-card rounded-xl overflow-auto max-h-[75vh] shadow-inner flex justify-center w-full transition-colors">
              <div
                ref={overlayContainerRef}
                onClick={handlePageClick}
                onPointerDown={startDrawing}
                onPointerMove={onPointerMoveContainer}
                onPointerUp={onPointerUpContainer}
                className={`relative cursor-crosshair inline-block ${activeTool === "draw" ? "touch-none" : ""}`}
              >
                <canvas ref={canvasRef} className="block" />

                {/* The in-progress stroke, so drawing gives live feedback. */}
                {isDrawing && currentPath.length > 1 && (
                  <svg className="absolute inset-0 pointer-events-none w-full h-full">
                    <polyline
                      fill="none"
                      stroke={drawColor}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={currentPath.map((p) => `${p.x},${p.y}`).join(" ")}
                    />
                  </svg>
                )}

                {annotations
                  .filter((ann) => ann.pageIndex === selectedPageIndex)
                  .map((ann) => {
                    if (ann.type === "draw") {
                      const svgPoints = ann.path.map((p) => `${p.x},${p.y}`).join(" ");
                      return (
                        <svg key={ann.id} className="absolute inset-0 pointer-events-none w-full h-full">
                          <polyline
                            fill="none"
                            stroke={ann.color}
                            strokeWidth={ann.strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={svgPoints}
                          />
                        </svg>
                      );
                    }

                    const isSelected = selectedAnnotationId === ann.id;

                    if (ann.type === "replace") {
                      return (
                        <div
                          key={ann.id}
                          onPointerDown={(e) => startDragAnnotation(e, ann.id, ann.x, ann.y)}
                          style={{
                            position: "absolute",
                            left: `${ann.x}px`,
                            top: `${ann.y}px`,
                            width: `${ann.width}px`,
                            height: `${ann.height}px`,
                          }}
                          className={`flex items-center bg-white px-1 select-none cursor-move group touch-none ${isSelected ? "ring-2 ring-ring shadow-md" : "border border-dashed border-muted-foreground/60"
                            }`}
                        >
                          <span
                            style={{
                              fontSize: `${ann.fontSize}px`,
                              fontWeight: ann.isBold ? "bold" : "normal",
                              fontStyle: ann.isItalic ? "italic" : "normal",
                              color: ann.color,
                              lineHeight: 1,
                            }}
                            className="truncate pointer-events-none"
                          >
                            {ann.newText}
                          </span>
                        </div>
                      );
                    }

                    if (ann.type === "text") {
                      return (
                        <div
                          key={ann.id}
                          onPointerDown={(e) => startDragAnnotation(e, ann.id, ann.x, ann.y)}
                          style={{
                            position: "absolute",
                            left: `${ann.x}px`,
                            top: `${ann.y}px`,
                          }}
                          className={`px-1.5 py-0.5 select-none cursor-move rounded touch-none ${isSelected ? "ring-2 ring-ring bg-primary/10 shadow-md" : "hover:bg-primary/5 border border-transparent hover:border-primary/30"
                            }`}
                        >
                          <span
                            style={{
                              fontSize: `${ann.fontSize}px`,
                              fontWeight: ann.isBold ? "bold" : "normal",
                              fontStyle: ann.isItalic ? "italic" : "normal",
                              color: ann.color,
                            }}
                            className="pointer-events-none whitespace-nowrap block"
                          >
                            {ann.text}
                          </span>
                        </div>
                      );
                    }

                    return null;
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}