"use client";

import React, { useState } from "react";
import { FileText, Trash2, Loader2, Download } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function WordToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const selectedFile = fileList[0];
    if (
      selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      selectedFile.type === "application/msword" ||
      selectedFile.name.endsWith(".docx") ||
      selectedFile.name.endsWith(".doc")
    ) {
      setFile(selectedFile);
      setError(null);
    } else {
      setError("Please upload a valid Word document (.docx or .doc).");
    }
  };

  const clearFile = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setError(null);
  };

  const handleConvert = async () => {
    const signal = begin();
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/word-to-pdf", {
        method: "POST",
        body: formData, signal });

      if (!res.ok) {
        let errorMessage = "Conversion failed.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Fallback if response is not json
        }
        throw new Error(errorMessage);
      }

      const blob = await res.blob();
      downloadBlob(blob, `${file.name.replace(/\.[^/.]+$/, "")}_converted.pdf`);
    } catch (err: unknown) {
      if (wasCancelled(err, signal)) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred during conversion.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Header — same pattern as the other tool pages */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-cyan-950/60 border border-purple-200 dark:border-cyan-800/40 flex items-center justify-center mb-3">
          <FileText className="text-purple-900 dark:text-cyan-400 w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          Convert Word to PDF
        </h1>
        <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Transform your Word documents into professional, secure PDF files instantly.
        </p>
      </div>

      {!file ? (
        <div className="space-y-4">
          <UploadCard
            onFiles={handleFileChange}
            accept=".doc,.docx"
            title="Click to browse or drag & drop a Word file"
            hint="DOCX and DOC documents"
          />

          {/* An invalid-file message before upload had nowhere to render before */}
          {error && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {/* File summary */}
          <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-100 dark:bg-cyan-500/10 border border-purple-200 dark:border-cyan-500/20 flex items-center justify-center shrink-0">
                <FileText className="text-purple-900 dark:text-cyan-400 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{file.name}</p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 truncate">
                  Size: <strong className="text-fg">{formatSize(file.size)}</strong>
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

          {error && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={clearFile}
              className="w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl border border-card text-muted hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors"
            >
              Select Different File
            </button>
            <button
              type="button"
              onClick={handleConvert}
              disabled={loading}
              className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 sm:gap-2.5 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin w-[18px] h-[18px] sm:w-5 sm:h-5" />
              ) : (
                <Download className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              )}
              {loading ? "Converting..." : "Convert to PDF (.pdf)"}
            </button>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}