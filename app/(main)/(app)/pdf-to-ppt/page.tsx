"use client";

import React, { useState, useRef, JSX } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { FileText, Trash2, Download, Menu, FileStack } from "lucide-react";
import { downloadUrl as saveFromUrl } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function PdfToPpt(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (fileList: FileList | null): Promise<void> => {
    const signal = begin();
    const uploadedFile = fileList?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.type.includes("pdf")) {
      setError("Please upload a valid PDF document (.pdf).");
      return;
    }

    setFile(uploadedFile);
    setError(null);
    setSuccess(false);
    // Release the previous result before replacing it, or each conversion
    // leaks a blob for the life of the tab.
    setDownloadUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return null; });
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/pdf-to-ppt", {
        method: "POST",
        body: formData, signal });

      if (!response.ok) {
        let errorMessage = "Failed to process PDF.";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          const text = await response.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url);
      setSuccess(true);
    } catch (err: unknown) {
      if (wasCancelled(err, signal)) return;
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An error occurred while converting the PDF.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setSuccess(false);
    setError(null);
    setDownloadUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return null; });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = (): void => {
    if (!downloadUrl || !file) return;
    // Not revoked here. This URL is held in state and the button stays on
    // screen, so releasing it after the first click left the second click
    // pointing at nothing — the button appeared to do nothing at all. It is
    // released when the file is cleared or replaced instead.
    saveFromUrl(downloadUrl, `${file.name.replace(/\.[^/.]+$/, "")}-converted.pptx`);
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 text-fg flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Top nav bar */}
      <header className="w-full flex items-center justify-between px-4 sm:px-6 py-4 border-b border-card">
        <span className="text-base sm:text-lg font-bold tracking-tight text-fg">PDFAI</span>
        <button
          type="button"
          aria-label="Open menu"
          className="p-1.5 rounded-lg hover:bg-[var(--background-secondary)] transition cursor-pointer"
        >
          <Menu className="w-5 h-5 text-fg" />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="w-full max-w-2xl space-y-6 sm:space-y-8">

          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto rounded-xl bg-[var(--background-secondary)] border border-card flex items-center justify-center">
              <FileStack className="w-5 h-5 text-fg" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-fg">
              PDF to PowerPoint
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed px-2 sm:px-0">
              Transform pages from your PDF documents directly into styled PowerPoint presentation slides.
            </p>
          </div>

          {!file && (
            <UploadCard
              onFiles={handleFileUpload}
              title="Click to browse or drag & drop PDFs"
              hint="Upload a document to start converting"
            />
          )}

          {file && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between gap-3 bg-[var(--background-secondary)] border border-card p-3 sm:p-4 rounded-2xl">
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-fg truncate max-w-[140px] sm:max-w-[220px]">
                      {file.name}
                    </h3>
                    <span className="text-[10px] sm:text-[11px] text-muted">Ready for slide generation</span>
                  </div>
                </div>
                <button
                  onClick={handleClear}
                  className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 sm:px-3 py-1.5 rounded-xl border border-rose-500/20 transition cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>

              {loading && (
                <div className="text-center py-8 sm:py-10 text-muted text-xs animate-pulse px-4">
                  Parsing PDF layout and creating PowerPoint presentation slides...
                </div>
              )}

              {success && (
                <div className="bg-[var(--background-secondary)] border border-card rounded-2xl p-5 sm:p-6 text-center space-y-2.5 sm:space-y-3">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-900/10 dark:bg-slate-800 border border-slate-900/20 dark:border-slate-700 flex items-center justify-center text-fg mx-auto">
                    <FileStack className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-fg">Presentation Ready!</h3>
                  <p className="text-xs text-muted">Your PowerPoint slides have been compiled successfully.</p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-2.5 sm:p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
              {error}
            </div>
          )}

          {success && downloadUrl && (
            <button
              onClick={handleDownload}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold py-3 sm:py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg cursor-pointer text-sm border border-[var(--primary)]"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Download PowerPoint (.pptx)</span>
            </button>
          )}

          <div className="pb-8">
            <SecureNote />
          </div>

        </div>
      </main>
    </div>
  );
}