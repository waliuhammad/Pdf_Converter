"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   page preview the browser just rendered from the file the visitor picked (a
   canvas data URL). next/image cannot optimise it: there is no server-side
   image to resize. */

import React, { useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Loader2, Plus, Scissors, X } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { loadPdfjs } from "@/lib/pdf-libs";
// Type-only: the library itself arrives through loadPdfjs().
import type { PDFDocumentProxy } from "pdfjs-dist";
import { errorMessage as messageFrom, errorName } from "@/lib/errors";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";
import {
  parsePageSelection,
  planSplit,
  splitDownloadName,
  type SplitOptions,
  type SplitPlan,
} from "@/lib/split-plan";

type Tab = "range" | "pages";
type RangeMode = "custom" | "fixed";
type PagesMode = "all" | "select";
interface RangeInput {
  from: string;
  to: string;
}

/** Width the previews are rendered at; the grid shows them at about this size. */
const THUMB_WIDTH = 180;

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

/** {1,2,3,5,7,8} -> "1-3,5,7-8" */
function compactPages(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(i === j ? String(sorted[i]) : `${sorted[i]}-${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(",");
}

const pill = (active: boolean) =>
  `flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors ${
    active
      ? "bg-primary text-primary-foreground shadow"
      : "bg-background border border-border text-muted-foreground hover:text-foreground"
  }`;

const inputClass =
  "w-full bg-background border border-border rounded-xl px-3 py-2.5 sm:py-2 text-foreground text-base sm:text-sm focus:outline-none focus:border-primary";

export default function SplitPdfPage() {
  const { begin, cancel } = useCancellableRun();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loadingFile, setLoadingFile] = useState(false);

  const [tab, setTab] = useState<Tab>("range");
  const [rangeMode, setRangeMode] = useState<RangeMode>("custom");
  const [pagesMode, setPagesMode] = useState<PagesMode>("all");
  const [ranges, setRanges] = useState<RangeInput[]>([{ from: "1", to: "1" }]);
  const [fixedSize, setFixedSize] = useState("1");
  const [selection, setSelection] = useState("");
  const [mergeRanges, setMergeRanges] = useState(false);
  const [mergePages, setMergePages] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);

  const options: SplitOptions = useMemo(() => {
    if (tab === "range") {
      return rangeMode === "custom"
        ? {
            mode: "custom",
            ranges: ranges.map((r) => ({ from: parseInt(r.from, 10), to: parseInt(r.to, 10) })),
            merge: mergeRanges,
          }
        : { mode: "fixed", size: parseInt(fixedSize, 10), merge: mergeRanges };
    }
    return pagesMode === "all"
      ? { mode: "all", merge: mergePages }
      : { mode: "select", pages: selection, merge: mergePages };
  }, [tab, rangeMode, pagesMode, ranges, fixedSize, selection, mergeRanges, mergePages]);

  // Worked out as the visitor types, with the same function the server uses.
  const { plan, planError } = useMemo((): { plan: SplitPlan | null; planError: string | null } => {
    if (!pageCount) return { plan: null, planError: null };
    try {
      return { plan: planSplit(options, pageCount), planError: null };
    } catch (err) {
      return { plan: null, planError: messageFrom(err, "Check the page numbers.") };
    }
  }, [options, pageCount]);

  // Page index -> number of the output file it lands in (first, if several).
  const fileOfPage = useMemo(() => {
    const map = new Map<number, number>();
    plan?.files.forEach((group, n) => group.pages.forEach((p) => map.has(p) || map.set(p, n + 1)));
    return map;
  }, [plan]);

  const touched = () => {
    setError(null);
    setDownloaded(null);
  };

  const handleFiles = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a PDF file.");
      return;
    }

    const signal = begin();
    setFile(f);
    setPageCount(0);
    setThumbnails([]);
    setLoadingFile(true);
    touched();

    let doc: PDFDocumentProxy;
    try {
      const pdfjs = await loadPdfjs();
      doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
      if (signal.aborted) return;
      const total = doc.numPages;
      setPageCount(total);
      setRanges([{ from: "1", to: String(total) }]);
      setFixedSize("1");
      setSelection("");
      setLoadingFile(false);
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setLoadingFile(false);
      setFile(null);
      setError(
        errorName(err) === "PasswordException"
          ? "This PDF is password-protected. Unlock it first, then split it."
          : "That file could not be read as a PDF."
      );
      return;
    }

    // Previews are a convenience: if one fails to render, splitting still works.
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (signal.aborted) return;
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (signal.aborted) return;
        const url = canvas.toDataURL("image/jpeg", 0.8);
        setThumbnails((prev) => {
          const next = [...prev];
          next[i - 1] = url;
          return next;
        });
      }
    } catch (err) {
      if (!wasCancelled(err, signal)) console.error("Split PDF: page preview failed:", err);
    }
  };

  const resetAll = () => {
    cancel();
    setFile(null);
    setPageCount(0);
    setThumbnails([]);
    setLoadingFile(false);
    setProcessing(false);
    touched();
  };

  const updateRange = (index: number, key: keyof RangeInput, value: string) => {
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
    touched();
  };

  const addRange = () => {
    setRanges((prev) => {
      const lastTo = parseInt(prev[prev.length - 1]?.to ?? "0", 10) || 0;
      const from = Math.min(lastTo + 1, pageCount);
      return [...prev, { from: String(from), to: String(pageCount) }];
    });
    touched();
  };

  const removeRange = (index: number) => {
    setRanges((prev) => prev.filter((_, i) => i !== index));
    touched();
  };

  /** In "select pages", clicking a preview adds or removes that page. */
  const togglePage = (page: number) => {
    if (tab !== "pages" || pagesMode !== "select") return;
    let current: number[] = [];
    try {
      current = parsePageSelection(selection, pageCount).flatMap(({ from, to }) =>
        Array.from({ length: to - from + 1 }, (_, k) => from + k)
      );
    } catch {
      // An unfinished entry: start from the pages already clicked.
      current = [];
    }
    const next = current.includes(page) ? current.filter((p) => p !== page) : [...current, page];
    setSelection(compactPages(next));
    touched();
  };

  const handleSplit = async () => {
    if (!file || !plan) return;
    const signal = begin();
    setProcessing(true);
    touched();

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("options", JSON.stringify(options));
      const res = await fetch("/api/split-pdf", { method: "POST", body: form, signal });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to split the PDF.");
      }
      const blob = await res.blob();
      if (signal.aborted) return;
      const name = splitDownloadName(file.name, plan);
      downloadBlob(blob, name);
      setDownloaded(name);
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setError(messageFrom(err, "An unexpected error occurred while connecting to the server."));
    } finally {
      if (!signal.aborted) setProcessing(false);
    }
  };

  const outputCount = plan?.files.length ?? 0;
  const selectable = tab === "pages" && pagesMode === "select";

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center mb-3 text-foreground shadow-sm">
          <Scissors className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight px-2">
          Split PDF Pages
        </h1>
        <p className="text-muted-foreground text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Split a PDF into page ranges, fixed-size parts or single pages — or pull out just the pages you need.
        </p>
      </div>

      {!file ? (
        <>
          <UploadCard
            onFiles={handleFiles}
            title="Click to browse or drag & drop a PDF"
            hint="Upload a document to start splitting pages"
          />
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[13px] font-semibold text-center">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0 text-foreground">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-[13px] sm:text-sm font-bold truncate">{file.name}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                  Size: <strong className="text-foreground">{formatSize(file.size)}</strong> • Pages:{" "}
                  <strong className="text-foreground">{pageCount || "…"}</strong>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetAll}
              className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
            >
              <X size={15} /> <span className="hidden sm:inline">Remove</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            {/* Page previews */}
            <div className="lg:col-span-7 bg-card border border-border rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-3 border-b border-border">
                <span className="text-[11px] sm:text-xs font-extrabold text-foreground uppercase tracking-wider">
                  Pages
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  {selectable ? "Tap pages to select them" : "Badges show which file each page goes to"}
                </span>
              </div>

              {loadingFile ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1">
                  {Array.from({ length: pageCount }, (_, idx) => {
                    const fileNo = fileOfPage.get(idx);
                    const included = fileNo !== undefined;
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => togglePage(idx + 1)}
                        disabled={!selectable}
                        aria-pressed={selectable ? included : undefined}
                        className={`relative rounded-xl border p-1.5 flex flex-col items-center gap-1 text-left transition-all ${
                          selectable ? "cursor-pointer hover:border-primary" : "cursor-default"
                        } ${
                          included
                            ? "border-primary bg-accent"
                            : "border-border bg-background opacity-60"
                        }`}
                      >
                        <div className="w-full aspect-[3/4] flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                          {thumbnails[idx] ? (
                            <img
                              src={thumbnails[idx]}
                              alt={`Page ${idx + 1}`}
                              className="max-w-full max-h-full object-contain shadow-sm"
                            />
                          ) : (
                            <Loader2 className="animate-spin text-muted-foreground" size={18} />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">{idx + 1}</span>
                        {included && outputCount > 1 && (
                          <span className="absolute top-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
                            File {fileNo}
                          </span>
                        )}
                        {selectable && included && (
                          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-primary bg-background rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Options */}
            <div className="lg:col-span-5 bg-card border border-border rounded-2xl sm:rounded-3xl p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Scissors size={18} className="text-foreground shrink-0" />
                <span className="text-[13px] sm:text-sm font-extrabold text-foreground">Split options</span>
              </div>

              <div className="flex gap-2">
                <button type="button" className={pill(tab === "range")} onClick={() => { setTab("range"); touched(); }}>
                  Split by range
                </button>
                <button type="button" className={pill(tab === "pages")} onClick={() => { setTab("pages"); touched(); }}>
                  Extract pages
                </button>
              </div>

              {tab === "range" ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button type="button" className={pill(rangeMode === "custom")} onClick={() => { setRangeMode("custom"); touched(); }}>
                      Custom ranges
                    </button>
                    <button type="button" className={pill(rangeMode === "fixed")} onClick={() => { setRangeMode("fixed"); touched(); }}>
                      Fixed ranges
                    </button>
                  </div>

                  {rangeMode === "custom" ? (
                    <div className="space-y-2">
                      {ranges.map((r, i) => (
                        <div key={i} className="rounded-xl border border-border bg-background p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Range {i + 1}
                            </span>
                            {ranges.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRange(i)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                aria-label={`Remove range ${i + 1}`}
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] text-muted-foreground">
                              From page
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={pageCount}
                                value={r.from}
                                onChange={(e) => updateRange(i, "from", e.target.value)}
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                            <label className="text-[11px] text-muted-foreground">
                              To page
                              <input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={pageCount}
                                value={r.to}
                                onChange={(e) => updateRange(i, "to", e.target.value)}
                                className={`${inputClass} mt-1`}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addRange}
                        className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs font-bold text-foreground hover:border-primary hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Add range
                      </button>
                    </div>
                  ) : (
                    <label className="block text-[11px] text-muted-foreground">
                      Split into page ranges of
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={pageCount}
                          value={fixedSize}
                          onChange={(e) => { setFixedSize(e.target.value); touched(); }}
                          className={inputClass}
                        />
                        <span className="text-sm text-foreground shrink-0">pages</span>
                      </div>
                    </label>
                  )}

                  <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mergeRanges}
                      onChange={(e) => { setMergeRanges(e.target.checked); touched(); }}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    Merge all ranges into one PDF file
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button type="button" className={pill(pagesMode === "all")} onClick={() => { setPagesMode("all"); touched(); }}>
                      Extract all pages
                    </button>
                    <button type="button" className={pill(pagesMode === "select")} onClick={() => { setPagesMode("select"); touched(); }}>
                      Select pages
                    </button>
                  </div>

                  {pagesMode === "all" ? (
                    <p className="text-[12px] text-muted-foreground">
                      Every page becomes its own PDF file.
                    </p>
                  ) : (
                    <label className="block text-[11px] text-muted-foreground">
                      Pages to extract
                      <input
                        type="text"
                        inputMode="text"
                        placeholder="e.g. 1,5-8,12"
                        value={selection}
                        onChange={(e) => { setSelection(e.target.value); touched(); }}
                        className={`${inputClass} mt-1`}
                      />
                      <span className="block mt-1">Type pages and ranges, or tap the previews.</span>
                    </label>
                  )}

                  <label className="flex items-center gap-2 text-[13px] text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={mergePages}
                      onChange={(e) => { setMergePages(e.target.checked); touched(); }}
                      className="w-4 h-4 accent-[var(--primary)]"
                    />
                    Merge extracted pages into one PDF file
                  </label>
                </div>
              )}

              {/* What will come out */}
              <div className="rounded-xl bg-accent text-accent-foreground px-3 py-2.5 text-[13px] font-semibold">
                {planError ? (
                  <span className="text-red-600 dark:text-red-400">{planError}</span>
                ) : plan ? (
                  <>
                    {outputCount === 1 ? "1 PDF will be created." : `${outputCount} PDFs will be created (as a ZIP).`}
                    <span className="block text-[11px] font-normal opacity-80 mt-0.5 truncate">
                      {splitDownloadName(file.name, plan)}
                    </span>
                  </>
                ) : (
                  "Reading the PDF…"
                )}
              </div>

              {error && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                  {error}
                </div>
              )}
              {downloaded && (
                <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-xs font-semibold text-center truncate">
                  Downloaded {downloaded}
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={resetAll}
                  className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-border text-muted-foreground hover:text-foreground font-bold text-xs transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={processing || !plan}
                  className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-[13px] sm:text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary-hover)]"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  {processing ? "Splitting…" : "Split PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}
