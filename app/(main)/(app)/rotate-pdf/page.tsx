"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   page preview the browser just rendered from the file the visitor picked (a
   canvas data URL). next/image cannot optimise it: there is no server-side
   image to resize. */

import React, { useRef, useState, JSX } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { Download, FileText, Loader2, Plus, RotateCcw, RotateCw, Trash2, Undo2 } from "lucide-react";
import { errorMessage as messageFrom, errorName } from "@/lib/errors";
import { loadPdfjs } from "@/lib/pdf-libs";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

/** Matches the route's limit. */
const MAX_FILES = 20;
const THUMB_WIDTH = 160;

interface PageInfo {
  thumb?: string;
  /** As the page displays now, before this tool's rotation. */
  landscape: boolean;
}

interface Doc {
  id: number;
  file: File;
  pages: PageInfo[];
  /** Degrees clockwise to add, per page (0, 90, 180 or 270). */
  rotations: number[];
  loading: boolean;
  error?: string;
}

type Filter = "all" | "portrait" | "landscape";

const norm = (deg: number) => ((deg % 360) + 360) % 360;

const isLandscapeNow = (page: PageInfo, rotation: number) =>
  rotation % 180 === 0 ? page.landscape : !page.landscape;

/** The file name the server put in Content-Disposition, or a fallback. */
function nameFromResponse(res: Response, fallback: string): string {
  const header = res.headers.get("Content-Disposition") ?? "";
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      /* fall through */
    }
  }
  return header.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}

const pill = (active: boolean) =>
  `px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
    active
      ? "bg-primary text-primary-foreground shadow"
      : "bg-background border border-border text-muted-foreground hover:text-foreground"
  }`;

const iconButton =
  "p-1.5 rounded-lg bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground transition-colors";

export default function RotatePdfPage(): JSX.Element {
  const { begin, cancel } = useCancellableRun();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const nextId = useRef(1);
  const addInput = useRef<HTMLInputElement>(null);
  // Bumped when everything is cleared, so previews still rendering for the
  // old files stop writing into state.
  const generation = useRef(0);

  const touched = () => {
    setError(null);
    setDownloaded(null);
  };

  const updateDoc = (id: number, change: (d: Doc) => Doc) =>
    setDocs((prev) => prev.map((d) => (d.id === id ? change(d) : d)));

  const loadDoc = async (id: number, file: File, gen: number) => {
    const stale = () => gen !== generation.current;
    try {
      const pdfjs = await loadPdfjs();
      const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      if (stale()) return;

      const pages: PageInfo[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const vp = (await pdf.getPage(i)).getViewport({ scale: 1 });
        pages.push({ landscape: vp.width > vp.height });
      }
      if (stale()) return;
      updateDoc(id, (d) => ({ ...d, pages, rotations: pages.map(() => 0), loading: false }));

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: THUMB_WIDTH / Math.max(base.width, base.height) });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (stale()) return;
        const thumb = canvas.toDataURL("image/jpeg", 0.8);
        updateDoc(id, (d) => ({
          ...d,
          pages: d.pages.map((p, k) => (k === i - 1 ? { ...p, thumb } : p)),
        }));
      }
    } catch (err) {
      if (stale()) return;
      console.error("Rotate PDF: could not read", file.name, err);
      updateDoc(id, (d) => ({
        ...d,
        loading: false,
        error:
          errorName(err) === "PasswordException"
            ? "Password-protected — unlock it first."
            : "Could not be read as a PDF.",
      }));
    }
  };

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    touched();
    const pdfs = Array.from(list).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (pdfs.length < list.length) setError("Only PDF files can be rotated; the others were skipped.");

    const room = MAX_FILES - docs.length;
    if (pdfs.length > room) setError(`You can rotate up to ${MAX_FILES} files at a time.`);
    const added = pdfs.slice(0, Math.max(0, room)).map(
      (file): Doc => ({ id: nextId.current++, file, pages: [], rotations: [], loading: true })
    );
    if (added.length === 0) return;

    setDocs((prev) => [...prev, ...added]);
    const gen = generation.current;
    for (const d of added) void loadDoc(d.id, d.file, gen);
  };

  /** Applies to a page only if it passes the orientation filter. */
  const matches = (page: PageInfo, rotation: number) =>
    filter === "all" || (filter === "landscape") === isLandscapeNow(page, rotation);

  const rotateDoc = (id: number, delta: number) => {
    touched();
    updateDoc(id, (d) => ({
      ...d,
      rotations: d.rotations.map((r, k) => (matches(d.pages[k], r) ? norm(r + delta) : r)),
    }));
  };

  const rotateEverything = (delta: number) => {
    touched();
    setDocs((prev) =>
      prev.map((d) => ({
        ...d,
        rotations: d.rotations.map((r, k) => (matches(d.pages[k], r) ? norm(r + delta) : r)),
      }))
    );
  };

  const rotatePage = (id: number, index: number, delta: number) => {
    touched();
    updateDoc(id, (d) => ({
      ...d,
      rotations: d.rotations.map((r, k) => (k === index ? norm(r + delta) : r)),
    }));
  };

  const resetRotations = () => {
    touched();
    setDocs((prev) => prev.map((d) => ({ ...d, rotations: d.rotations.map(() => 0) })));
  };

  const removeDoc = (id: number) => {
    touched();
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const clearAll = () => {
    cancel();
    generation.current++;
    setDocs([]);
    setLoading(false);
    touched();
  };

  const ready = docs.filter((d) => !d.loading && !d.error);
  const changedPages = ready.reduce((n, d) => n + d.rotations.filter((r) => r !== 0).length, 0);
  const busy = docs.some((d) => d.loading);

  const handleDownload = async () => {
    if (ready.length === 0) return;
    const signal = begin();
    setLoading(true);
    touched();

    try {
      const form = new FormData();
      const rotations: Record<number, number>[] = [];
      for (const d of ready) {
        form.append("file", d.file);
        const map: Record<number, number> = {};
        d.rotations.forEach((r, k) => {
          if (r) map[k] = r;
        });
        rotations.push(map);
      }
      form.append("rotations", JSON.stringify(rotations));

      const res = await fetch("/api/rotate-pdf", { method: "POST", body: form, signal });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Rotation failed.");
      }
      const blob = await res.blob();
      if (signal.aborted) return;
      const fallback =
        ready.length === 1
          ? `${ready[0].file.name.replace(/\.pdf$/i, "")}_rotated.pdf`
          : "rotated_pdfs.zip";
      const name = nameFromResponse(res, fallback);
      downloadBlob(blob, name);
      setDownloaded(name);
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setError(messageFrom(err, "An error occurred during rotation."));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center mb-3 text-foreground shadow-sm">
          <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight px-2">
          Rotate PDF Pages
        </h1>
        <p className="text-muted-foreground text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Rotate whole documents or individual pages. Add several PDFs and rotate them all at once.
        </p>
      </div>

      {docs.length === 0 ? (
        <>
          <UploadCard
            onFiles={handleFiles}
            multiple
            title="Click to browse or drag & drop PDFs"
            hint={`Up to ${MAX_FILES} PDF documents`}
          />
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[13px] font-semibold text-center">
              {error}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* Toolbar */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-foreground uppercase tracking-wider mr-1">Rotate all</span>
              <button type="button" onClick={() => rotateEverything(-90)} className={`${pill(false)} flex items-center gap-1.5`}>
                <RotateCcw size={14} /> Left
              </button>
              <button type="button" onClick={() => rotateEverything(90)} className={`${pill(false)} flex items-center gap-1.5`}>
                <RotateCw size={14} /> Right
              </button>
              <button type="button" onClick={resetRotations} className={`${pill(false)} flex items-center gap-1.5`}>
                <Undo2 size={14} /> Reset all
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Apply to</span>
              {(["all", "portrait", "landscape"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={pill(filter === f)}>
                  {f === "all" ? "All pages" : f === "portrait" ? "Portrait" : "Landscape"}
                </button>
              ))}
            </div>
          </div>

          {/* Documents */}
          {docs.map((d) => (
            <div key={d.id} className="bg-card border border-border rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center text-foreground shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground text-[13px] sm:text-sm font-bold truncate">{d.file.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {(d.file.size / (1024 * 1024)).toFixed(2)} MB
                      {d.pages.length > 0 && ` • ${d.pages.length} ${d.pages.length === 1 ? "page" : "pages"}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!d.loading && !d.error && (
                    <>
                      <button type="button" onClick={() => rotateDoc(d.id, -90)} className={iconButton} title="Rotate this file left">
                        <RotateCcw size={16} />
                      </button>
                      <button type="button" onClick={() => rotateDoc(d.id, 90)} className={iconButton} title="Rotate this file right">
                        <RotateCw size={16} />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Remove file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {d.loading ? (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="animate-spin" size={22} />
                </div>
              ) : d.error ? (
                <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">{d.error} It will be left out.</p>
              ) : (
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {d.pages.map((p, k) => {
                    const r = d.rotations[k] ?? 0;
                    return (
                      <div
                        key={k}
                        className={`rounded-xl border p-1.5 flex flex-col items-center gap-1.5 ${
                          r ? "border-primary bg-accent" : "border-border bg-background"
                        }`}
                      >
                        <div className="w-full aspect-square flex items-center justify-center bg-muted rounded-lg overflow-hidden">
                          {p.thumb ? (
                            <img
                              src={p.thumb}
                              alt={`Page ${k + 1}`}
                              className="max-w-[85%] max-h-[85%] object-contain shadow-sm transition-transform duration-300"
                              style={{ transform: `rotate(${r}deg)` }}
                            />
                          ) : (
                            <Loader2 className="animate-spin text-muted-foreground" size={16} />
                          )}
                        </div>
                        <div className="w-full flex items-center justify-between gap-1">
                          <button type="button" onClick={() => rotatePage(d.id, k, -90)} className={iconButton} title={`Rotate page ${k + 1} left`}>
                            <RotateCcw size={13} />
                          </button>
                          <span className="text-[11px] font-semibold text-foreground">
                            {k + 1}
                            {r !== 0 && <span className="text-muted-foreground font-normal"> · {r}°</span>}
                          </span>
                          <button type="button" onClick={() => rotatePage(d.id, k, 90)} className={iconButton} title={`Rotate page ${k + 1} right`}>
                            <RotateCw size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {docs.length < MAX_FILES && (
            <>
              <button
                type="button"
                onClick={() => addInput.current?.click()}
                className="w-full py-3 rounded-2xl border border-dashed border-border text-xs font-bold text-foreground hover:border-primary hover:bg-accent transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} /> Add more PDFs
              </button>
              <input
                ref={addInput}
                type="file"
                accept="application/pdf"
                multiple
                hidden
                onChange={(e) => {
                  handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[13px] font-semibold text-center">
              {error}
            </div>
          )}
          {downloaded && (
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400 text-[13px] font-semibold text-center truncate">
              Downloaded {downloaded}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={clearAll}
              className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-border text-muted-foreground hover:text-foreground font-bold text-xs transition-colors"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || busy || ready.length === 0}
              className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground font-bold text-[13px] sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all hover:bg-[var(--primary-hover)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>
                {loading
                  ? "Rotating…"
                  : `Rotate & download ${ready.length > 1 ? `${ready.length} PDFs (ZIP)` : "PDF"}`}
                {!loading && changedPages === 0 && ready.length > 0 && " — no changes yet"}
              </span>
            </button>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}
