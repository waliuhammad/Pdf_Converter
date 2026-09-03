"use client";

import React, { useState } from "react";
import { UploadCard, FileChip, SecureNote } from "@/components/tools/upload-card";
import { Presentation, Download, Loader2 } from "lucide-react";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function PptToPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFileChange = (fileList: FileList | null) => {
    if (fileList && fileList[0]) {
      const selectedFile = fileList[0];
      const fileName = selectedFile.name.toLowerCase();

      if (!fileName.endsWith(".ppt") && !fileName.endsWith(".pptx")) {
        setError("Please upload a valid PowerPoint (.ppt or .pptx) file.");
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const clearFile = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setError(null);
  };

  const handleConvert = async (e: React.FormEvent) => {
    const signal = begin();
    e.preventDefault();
    if (!file) {
      setError("Please select a PowerPoint file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ppt-to-pdf", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        let errorMessage = "Failed to convert PPT to PDF.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      downloadBlob(blob, `${file.name.replace(/\.[^/.]+$/, "")}-converted.pdf`);
    } catch (err: unknown) {
      if (wasCancelled(err, signal)) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
      {/* Header — same pattern as the other tool pages */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-card border border-card flex items-center justify-center mb-3 text-slate-700 dark:text-sky-400 shadow-sm">
          <Presentation className="w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
          PPT to PDF Converter
        </h1>
        <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
          Transform your PowerPoint presentation slides into clean, secure PDF output.
        </p>
      </div>

      <form onSubmit={handleConvert} className="w-full space-y-4 sm:space-y-6">
        {!file ? (
          <UploadCard
            onFiles={handleFileChange}
            accept=".pptx,.ppt"
            title="Click to browse or drag & drop a PowerPoint file"
            hint="Supports .pptx and .ppt formats"
          />
        ) : (
          <FileChip name={file.name} size={formatSize(file.size)} onRemove={clearFile} />
        )}

        {error && (
          <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
            {error}
          </div>
        )}

        {file && (
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-4 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={clearFile}
              className="w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl border border-card text-muted hover:text-slate-900 dark:hover:text-white font-bold text-sm transition-colors"
            >
              Select Different File
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] border border-[var(--primary)] hover:border-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 sm:gap-2.5 transition-all cursor-pointer"
            >
              {loading ? (
                <Loader2 className="animate-spin w-[18px] h-[18px] sm:w-5 sm:h-5" />
              ) : (
                <Download className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              )}
              {loading ? "Converting presentation..." : "Convert to PDF"}
            </button>
          </div>
        )}
      </form>

      <SecureNote />
    </div>
  );
}