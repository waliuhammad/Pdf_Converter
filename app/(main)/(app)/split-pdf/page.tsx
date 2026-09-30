"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   preview the browser just generated from the file the visitor picked: an
   object URL or a canvas data URL. next/image cannot optimise either, since
   there is no server-side image to resize; it would need unoptimized, which
   renders this same tag inside a wrapper. Disabled for the file rather than
   per line because some of these sit inside ternaries, where a JSX comment is
   a syntax error and the two comment styles would have to be mixed. */


import React, { useState, useRef, useEffect } from "react";
import { FileText, X, Scissors, Download, Loader2 } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { loadPdfLib, loadPdfjs } from "@/lib/pdf-libs";
// aliased: this component already has state called errorMessage, which would
// shadow the import and turn the call below into calling a string.
import { errorMessage as messageFrom } from "@/lib/errors";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function SplitPdfPage() {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [fileDetails, setFileDetails] = useState<{ name: string; size: string } | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [splitMode, setSplitMode] = useState<"range" | "every">("range");
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("1");
  const [everyN, setEveryN] = useState("1");
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [downloadChoice, setDownloadChoice] = useState<"split" | "remaining" | "both">("split");
  const [selectingFrom, setSelectingFrom] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Custom scrollbar thumb dragging states
  const [isDraggingThumb, setIsDraggingThumb] = useState(false);
  const [thumbTop, setThumbTop] = useState(0);
  const [thumbHeight, setThumbHeight] = useState(40);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const startScrollTop = useRef(0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleModeChange = (mode: "range" | "every") => {
    setSplitMode(mode);
    setDone(false);
    setErrorMessage(null);
  };

  const generateThumbnails = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await loadPdfjs();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;
      setPageCount(numPages);

      const thumbs: string[] = [];
      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          thumbs.push(canvas.toDataURL());
        }
      }
      setThumbnails(thumbs);
    } catch (err) {
      if (wasCancelled(err)) return;
      console.error("Error generating real page thumbnails:", err);
      setErrorMessage("Could not render actual page previews for this PDF.");
    }
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
      const { PDFDocument } = await loadPdfLib();
      const pdf = await PDFDocument.load(arrayBuffer);
      const totalPages = pdf.getPageCount();

      setRawFile(f);
      setFileDetails({ name: f.name, size: formatSize(f.size) });
      setDone(false);
      setErrorMessage(null);
      setDownloadChoice("split");
      setFromPage("1");
      setToPage(String(totalPages > 1 ? totalPages : 1));
      setSelectingFrom(true);

      await generateThumbnails(f);
    } catch (err) {
      if (wasCancelled(err)) return;
      console.error("Error reading PDF:", err);
      setErrorMessage("Failed to read the selected PDF file.");
    }
  };

  const resetAll = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFileDetails(null);
    setRawFile(null);
    setDone(false);
    setErrorMessage(null);
    setThumbnails([]);
  };

  // Synchronize custom scrollbar thumb dimensions and position
  const updateScrollbar = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight <= clientHeight) {
      setThumbHeight(clientHeight);
      setThumbTop(0);
      return;
    }

    const calculatedThumbHeight = Math.max((clientHeight / scrollHeight) * clientHeight, 40);
    const maxScrollTop = scrollHeight - clientHeight;
    const maxThumbTop = clientHeight - calculatedThumbHeight;
    const calculatedThumbTop = (scrollTop / maxScrollTop) * maxThumbTop;

    setThumbHeight(calculatedThumbHeight);
    setThumbTop(calculatedThumbTop);
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollbar();
    const handleScroll = () => updateScrollbar();
    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", updateScrollbar);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollbar);
    };
  }, [thumbnails]);

  // Handle dragging the custom scrollbar thumb.
  // Pointer events rather than mouse events, so the thumb also responds to
  // touch and stylus: on a phone the mouse-only version was inert.
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingThumb || !scrollContainerRef.current || !trackRef.current) return;

      const container = scrollContainerRef.current;
      const track = trackRef.current;
      const trackRect = track.getBoundingClientRect();

      const deltaY = e.clientY - dragStartY.current;
      const maxThumbTop = trackRect.height - thumbHeight;
      if (maxThumbTop <= 0) return;

      const newThumbTop = Math.min(Math.max(0, startScrollTop.current + deltaY), maxThumbTop);
      const scrollRatio = newThumbTop / maxThumbTop;
      container.scrollTop = scrollRatio * (container.scrollHeight - container.clientHeight);
    };

    const handlePointerUp = () => {
      setIsDraggingThumb(false);
    };

    if (isDraggingThumb) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDraggingThumb, thumbHeight]);

  const handleThumbPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDraggingThumb(true);
    dragStartY.current = e.clientY;
    const container = scrollContainerRef.current;
    if (!container || !trackRef.current) return;
    const maxThumbTop = trackRef.current.clientHeight - thumbHeight;
    if (maxThumbTop <= 0) return;
    startScrollTop.current =
      (container.scrollTop / (container.scrollHeight - container.clientHeight)) * maxThumbTop;
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === trackRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const trackRect = trackRef.current.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const ratio = clickY / trackRect.height;
      container.scrollTop = ratio * (container.scrollHeight - container.clientHeight);
    }
  };

  const handlePageClick = (page: number) => {
    if (splitMode !== "range") return;
    setDone(false);
    setErrorMessage(null);
    if (selectingFrom) {
      setFromPage(String(page));
      setToPage(String(page));
      setSelectingFrom(false);
    } else {
      const from = Number(fromPage);
      if (page >= from) {
        setToPage(String(page));
      } else {
        setToPage(fromPage);
        setFromPage(String(page));
      }
      setSelectingFrom(true);
    }
  };

  const handleInitialSplit = () => {
    setProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      setProcessing(false);
      setDone(true);
    }, 400);
  };

  const executeDownload = async (choice: "split" | "remaining" | "both") => {
    const signal = begin();
    if (!rawFile) return;
    setProcessing(true);
    setErrorMessage(null);

    const downloadSingle = async (type: "split" | "remaining") => {
      const signal = begin();
      const formData = new FormData();
      formData.append("file", rawFile);
      formData.append("splitMode", splitMode);
      formData.append("fromPage", fromPage);
      formData.append("toPage", toPage);
      formData.append("everyN", everyN);
      formData.append("downloadChoice", type);

      const response = await fetch("/api/split-pdf", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to split PDF. Check your selected page range.");
      }

      const blob = await response.blob();
      downloadBlob(blob, type === "remaining" ? "remaining-pages.pdf" : "split-document.pdf");
    };

    try {
      if (choice === "both") {
        await downloadSingle("split");
        await new Promise((resolve) => setTimeout(resolve, 500));
        await downloadSingle("remaining");
      } else {
        await downloadSingle(choice);
      }
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setErrorMessage(messageFrom(err, "An unexpected error occurred while connecting to the server."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-card flex items-center justify-center mb-3 text-fg shadow-sm">
          <Scissors className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          Split PDF Pages
        </h1>
        <p className="text-muted-foreground text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Separate one PDF into multiple files, extract page ranges, or split documents easily.
        </p>
      </div>

      {!fileDetails ? (
        <UploadCard
          onFiles={handleFile}
          title="Click to browse or drag & drop PDFs"
          hint="Upload a document to start splitting pages"
        />
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-card border border-card flex items-center justify-center shrink-0 text-fg">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{fileDetails.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Size: <strong className="text-fg">{fileDetails.size}</strong> • Pages:{" "}
                  <strong className="text-fg">{pageCount}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="py-2 px-3 sm:px-3.5 rounded-xl bg-red-100 dark:bg-red-950/50 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <X size={15} /> <span className="hidden xs:inline sm:inline">Remove</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
            {/* Left: page preview */}
            <div className="lg:col-span-5 bg-card border border-card rounded-2xl sm:rounded-3xl py-3 px-0 shadow-md flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 pb-2 px-4 border-b border-card">
                <span className="text-[11px] sm:text-xs font-extrabold text-fg uppercase tracking-wider">
                  Page Preview
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  Scroll • Tap to select
                </span>
              </div>

              {thumbnails.length > 0 ? (
                <div className="relative flex items-stretch gap-2 my-2 px-2">
                  <div
                    ref={scrollContainerRef}
                    className="flex-1 flex flex-col items-center gap-3 h-[300px] sm:h-[360px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => {
                      const idx = page - 1;
                      const inRange =
                        !done &&
                        splitMode === "range" &&
                        page >= Number(fromPage) &&
                        page <= Number(toPage);
                      const isEdge =
                        !done &&
                        splitMode === "range" &&
                        (page === Number(fromPage) || page === Number(toPage));

                      return (
                        <div
                          key={page}
                          onClick={() => !done && handlePageClick(page)}
                          className={`cursor-pointer w-full max-w-[260px] sm:max-w-[340px] h-[240px] sm:h-[300px] rounded-2xl border p-0.5 flex flex-col items-center justify-between transition-all select-none shrink-0 ${isEdge
                            ? "border-primary bg-card shadow-md"
                            : inRange
                              ? "border-primary/40 bg-card/30"
                              : "border-card bg-card hover:border-foreground/20"
                            }`}
                        >
                          <div className="w-full flex items-center justify-between gap-1 px-2 pt-1 mb-0.5 shrink-0">
                            <span
                              className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md truncate ${isEdge
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-foreground/80"
                                }`}
                            >
                              Page {page} of {pageCount}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground shrink-0">
                              {isEdge ? "Edge" : inRange ? "Selected" : "Tap"}
                            </span>
                          </div>

                          <div className="flex-1 w-full flex items-center justify-center bg-muted rounded-xl overflow-hidden border border-card p-0 m-0">
                            {thumbnails[idx] ? (
                              <img
                                src={thumbnails[idx]}
                                alt={`Page ${page}`}
                                className="object-cover h-full w-full rounded m-0 p-0 block"
                              />
                            ) : (
                              <Loader2 className="animate-spin text-muted-foreground" size={20} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div
                    ref={trackRef}
                    onClick={handleTrackClick}
                    className="relative w-1.5 sm:w-2 bg-muted rounded-full cursor-pointer my-1 shrink-0"
                  >
                    <div
                      onPointerDown={handleThumbPointerDown}
                      style={{
                        height: `${thumbHeight}px`,
                        transform: `translateY(${thumbTop}px)`,
                        touchAction: "none",
                      }}
                      className={`absolute top-0 left-0 w-full rounded-full cursor-grab active:cursor-grabbing transition-colors ${isDraggingThumb
                        ? "bg-primary"
                        : "bg-foreground/30 hover:bg-foreground/45"
                        }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-[300px] sm:h-[360px] flex items-center justify-center text-muted-foreground my-2">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              )}

              <div className="pt-2 px-4 border-t border-card flex items-center justify-between text-[11px] sm:text-xs text-muted-foreground">
                <span>Total pages: {pageCount}</span>
                <span>Ready to split</span>
              </div>
            </div>

            {/* Right: split configuration */}
            <div className="lg:col-span-7 flex">
              <div className="bg-card border border-card rounded-2xl sm:rounded-3xl p-3 shadow-md flex flex-col justify-between w-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 px-1 sm:px-2 border-b border-card">
                    <div className="flex items-center gap-2">
                      <Scissors size={18} className="text-fg shrink-0" />
                      <span className="text-[13px] sm:text-sm font-extrabold text-fg">Split Configuration</span>
                    </div>
                  </div>

                  <div className="space-y-3 px-1 sm:px-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleModeChange("range")}
                        className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${splitMode === "range"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                          : "bg-card border border-card text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Extract Page Range
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModeChange("every")}
                        className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all ${splitMode === "every"
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                          : "bg-card border border-card text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        Split Every N Pages
                      </button>
                    </div>

                    {splitMode === "range" ? (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                            From Page
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={pageCount}
                            value={fromPage}
                            onChange={(e) => {
                              setFromPage(e.target.value);
                              setSelectingFrom(false);
                              setDone(false);
                              setErrorMessage(null);
                            }}
                            className="w-full bg-card border border-card rounded-xl px-3 py-2.5 sm:py-2 text-fg text-base sm:text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                            To Page
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            max={pageCount}
                            value={toPage}
                            onChange={(e) => {
                              setToPage(e.target.value);
                              setSelectingFrom(true);
                              setDone(false);
                              setErrorMessage(null);
                            }}
                            className="w-full bg-card border border-card rounded-xl px-3 py-2.5 sm:py-2 text-fg text-base sm:text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1">
                        <label className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-muted-foreground block mb-1">
                          Pages per File
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max={pageCount}
                          value={everyN}
                          onChange={(e) => {
                            setEveryN(e.target.value);
                            setDone(false);
                            setErrorMessage(null);
                          }}
                          className="w-full bg-card border border-card rounded-xl px-3 py-2.5 sm:py-2 text-fg text-base sm:text-sm focus:outline-none focus:border-primary"
                        />
                      </div>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="mx-1 sm:mx-2 p-2.5 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                      {errorMessage}
                    </div>
                  )}
                </div>

                <div className="pt-3 px-1 sm:px-2 mt-auto border-t border-card">
                  {!done ? (
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                      <button
                        type="button"
                        onClick={resetAll}
                        className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-card text-muted-foreground hover:text-foreground font-bold text-xs transition-colors"
                      >
                        Clear All
                      </button>
                      <button
                        type="button"
                        onClick={handleInitialSplit}
                        disabled={processing}
                        className="w-full sm:flex-1 py-3.5 sm:py-3 px-4 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-[13px] sm:text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary-hover)]"
                      >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <Scissors size={18} />}
                        {processing ? "Processing..." : "Proceed to Split Options"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="pb-1">
                        <span className="text-[11px] sm:text-xs font-extrabold text-fg uppercase tracking-wider">
                          Download Options
                        </span>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setDownloadChoice("split")}
                          className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between gap-2 ${downloadChoice === "split"
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                            : "bg-card border border-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <span>Split Part</span>
                          <span className="opacity-80 font-normal shrink-0">
                            ({splitMode === "range" ? `${fromPage}–${toPage}` : `Every ${everyN}`})
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownloadChoice("remaining")}
                          className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between gap-2 ${downloadChoice === "remaining"
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                            : "bg-card border border-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <span>Remaining Part</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDownloadChoice("both")}
                          className={`w-full px-4 py-3 sm:py-2.5 rounded-xl text-xs font-bold transition-all text-left flex items-center justify-between gap-2 ${downloadChoice === "both"
                            ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg"
                            : "bg-card border border-card text-muted-foreground hover:text-foreground"
                            }`}
                        >
                          <span>Both (Split &amp; Remaining)</span>
                          <span className="opacity-80 font-normal shrink-0">(2 files)</span>
                        </button>
                      </div>

                      <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                        <button
                          type="button"
                          onClick={() => setDone(false)}
                          className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-card text-muted-foreground hover:text-foreground font-bold text-xs transition-colors"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => executeDownload(downloadChoice)}
                          disabled={processing}
                          className="w-full sm:flex-1 py-3.5 sm:py-3 px-4 rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] font-bold text-[13px] sm:text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary-hover)]"
                        >
                          {processing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                          {processing
                            ? "Downloading..."
                            : `Download ${downloadChoice === "split"
                              ? "Split PDF"
                              : downloadChoice === "remaining"
                                ? "Remaining"
                                : "Both Files"
                            }`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}