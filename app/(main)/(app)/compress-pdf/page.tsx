"use client";

import { useRef, useState } from "react";
import { FileText, X, FileArchive, Download, Loader2, CheckCircle2, Plus, ArrowDownAZ } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { errorMessage as messageFrom } from "@/lib/errors";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

type Level = "extreme" | "recommended" | "less";

const LEVELS: { id: Level; title: string; detail: string }[] = [
  { id: "extreme", title: "Extreme compression", detail: "Smallest file, lower image quality" },
  { id: "recommended", title: "Recommended compression", detail: "Good quality, good compression" },
  { id: "less", title: "Less compression", detail: "High quality, smaller saving" },
];

const MAX_FILES = 10;

interface QueuedFile {
  id: string;
  file: File;
}

interface FileResult {
  name: string;
  originalSize: number;
  compressedSize: number;
  keptOriginal: boolean;
  reason?: string;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const savedPercent = (r: FileResult) =>
  r.originalSize > 0 ? Math.max(0, Math.round((1 - r.compressedSize / r.originalSize) * 100)) : 0;

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");

export default function CompressPdfPage() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [level, setLevel] = useState<Level>("recommended");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<FileResult[] | null>(null);
  const [output, setOutput] = useState<{ blob: Blob; name: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { begin, cancel } = useCancellableRun();
  const addInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const resetResult = () => {
    setResults(null);
    setOutput(null);
    setErrorMessage(null);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    const pdfs = incoming.filter(isPdf);
    const room = MAX_FILES - files.length;
    const accepted = pdfs.slice(0, Math.max(0, room));

    cancel();
    resetResult();
    setFiles((prev) => [...prev, ...accepted.map((file) => ({ id: `f${nextId.current++}`, file }))]);

    if (pdfs.length < incoming.length) setErrorMessage("Only PDF files can be compressed; other files were skipped.");
    else if (accepted.length < pdfs.length) setErrorMessage(`You can compress up to ${MAX_FILES} files at a time.`);
  };

  const removeFile = (id: string) => {
    cancel();
    setProcessing(false);
    resetResult();
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const clearAll = () => {
    cancel();
    setProcessing(false);
    resetResult();
    setFiles([]);
  };

  const sortByName = () => {
    setFiles((prev) => [...prev].sort((a, b) => a.file.name.localeCompare(b.file.name, undefined, { numeric: true })));
  };

  const executeCompress = async () => {
    if (files.length === 0) return;
    const signal = begin();
    setProcessing(true);
    resetResult();

    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f.file));
      formData.append("level", level);

      const response = await fetch("/api/compress-pdf", { method: "POST", body: formData, signal });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to compress PDF.");
      }

      const blob = await response.blob();
      if (signal.aborted) return;

      let parsed: FileResult[] = [];
      try {
        parsed = JSON.parse(decodeURIComponent(response.headers.get("X-Compress-Results") ?? "[]"));
      } catch {
        parsed = [];
      }
      if (parsed.length === 0 && files.length === 1) {
        parsed = [{ name: files[0].file.name, originalSize: files[0].file.size, compressedSize: blob.size, keptOriginal: blob.size >= files[0].file.size }];
      }

      const name = files.length === 1 ? files[0].file.name : "compressed_pdfs.zip";
      setResults(parsed);
      setOutput({ blob, name });
      downloadBlob(blob, name);
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setErrorMessage(messageFrom(err, "An error occurred while connecting to the server."));
    } finally {
      if (!signal.aborted) setProcessing(false);
    }
  };

  const totalOriginal = results?.reduce((s, r) => s + r.originalSize, 0) ?? 0;
  const totalCompressed = results?.reduce((s, r) => s + r.compressedSize, 0) ?? 0;
  const totalSaved = totalOriginal > 0 ? Math.max(0, Math.round((1 - totalCompressed / totalOriginal) * 100)) : 0;
  const resultFor = (name: string, index: number) => results?.[index]?.name === name ? results[index] : undefined;

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-border flex items-center justify-center mb-3 text-foreground">
          <FileArchive size={26} />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">Compress PDF</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1.5 max-w-lg mx-auto px-2">
          Make one or more PDFs smaller while keeping them looking as good as possible.
        </p>
      </div>

      <input
        ref={addInputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length === 0 ? (
        <UploadCard
          onFiles={addFiles}
          multiple
          title="Click to browse or drag & drop PDFs"
          hint={`Add up to ${MAX_FILES} PDFs to compress at once`}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
          {/* Files */}
          <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Files ({files.length})
              </span>
              <div className="flex items-center gap-2">
                {files.length > 1 && (
                  <button
                    type="button"
                    onClick={sortByName}
                    disabled={processing}
                    className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    title="Sort files by name"
                  >
                    <ArrowDownAZ size={14} /> Sort A–Z
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  disabled={processing || files.length >= MAX_FILES}
                  className="py-1.5 px-2.5 rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Add more PDFs"
                >
                  <Plus size={14} /> Add files
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {files.map((f, i) => {
                const r = resultFor(f.file.name, i);
                return (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{f.file.name}</p>
                      {r ? (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatSize(r.originalSize)} → <strong className="text-foreground">{formatSize(r.compressedSize)}</strong>
                          {r.keptOriginal ? (
                            <span className="block sm:inline sm:ml-2">{r.reason ?? "Already optimised; original kept."}</span>
                          ) : (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                              -{savedPercent(r)}%
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">{formatSize(f.file.size)}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="p-2 rounded-lg border border-border text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/50 transition-colors shrink-0"
                      title="Remove file"
                      aria-label={`Remove ${f.file.name}`}
                    >
                      <X size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Options + action */}
          <div className="lg:col-span-5 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pb-3 border-b border-border">
              Compression level
            </p>

            <div role="radiogroup" aria-label="Compression level" className="space-y-2">
              {LEVELS.map((opt) => {
                const selected = level === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={processing}
                    onClick={() => {
                      setLevel(opt.id);
                      resetResult();
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-colors flex items-start gap-3 disabled:opacity-60 ${
                      selected
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-background text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selected ? "border-primary" : "border-muted-foreground"
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block text-sm font-bold">{opt.title}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{opt.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold text-center">
                {errorMessage}
              </div>
            )}

            {results && output && (
              <div className="p-3 rounded-xl border border-border bg-background space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                  <CheckCircle2 size={18} />
                  <span>{files.length === 1 ? "PDF compressed" : "PDFs compressed"}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {totalSaved > 0 ? (
                    <>
                      Your {files.length === 1 ? "PDF is" : "PDFs are"} now <strong className="text-foreground">{totalSaved}% smaller</strong>:{" "}
                      {formatSize(totalOriginal)} → {formatSize(totalCompressed)}
                    </>
                  ) : (
                    <>These files could not be made any smaller, so the originals were returned unchanged.</>
                  )}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-1">
              {results && output ? (
                <button
                  type="button"
                  onClick={() => downloadBlob(output.blob, output.name)}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-colors hover:bg-[var(--primary-hover)]"
                >
                  <Download size={18} /> Download {files.length === 1 ? "PDF" : "ZIP"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executeCompress}
                  disabled={processing}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-colors hover:bg-[var(--primary-hover)]"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <FileArchive size={18} />}
                  {processing ? "Compressing…" : `Compress ${files.length === 1 ? "PDF" : `${files.length} PDFs`}`}
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="w-full py-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground font-semibold text-xs transition-colors"
              >
                {results ? "Start over" : "Clear all"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}
