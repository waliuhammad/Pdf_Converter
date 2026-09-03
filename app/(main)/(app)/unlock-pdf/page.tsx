"use client";

import React, { useState } from "react";
import { FileText, Trash2, Download, Eye, EyeOff, LockOpen, Loader2 } from "lucide-react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { errorMessage } from "@/lib/errors";
import { downloadBlob } from "@/lib/download";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function UnlockPdfPage() {
    const [file, setFile] = useState<{ name: string; size: string; rawFile: File } | null>(null);
    const { begin, cancel } = useCancellableRun();
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleFile = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const f = fileList[0];
        if (f.type !== "application/pdf") {
            // Was a silent return, so picking a .docx looked like nothing happened.
            setError("Please select a valid PDF document.");
            return;
        }

        setFile({ name: f.name, size: formatSize(f.size), rawFile: f });
        setDone(false);
        setError("");
    };

    const clearFile = () => {
    // Removing the file stops whatever it was being used for.
    cancel();
        setFile(null);
        setDone(false);
        setError("");
        setPassword("");
    };

    const handleUnlock = async (e: React.FormEvent) => {
      const signal = begin();
        e.preventDefault();
        if (!file) {
            setError("Please select a PDF file.");
            return;
        }
        if (!password) {
            setError("Please enter the document password.");
            return;
        }

        setProcessing(true);
        setError("");

        const formData = new FormData();
        formData.append("file", file.rawFile);
        formData.append("password", password);

        try {
            const res = await fetch("/api/unlock-pdf", {
                method: "POST",
                body: formData, signal });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to unlock PDF.");
            }

            const blob = await res.blob();
            downloadBlob(blob, `${file.name.replace(/\.[^/.]+$/, "")}-unlocked.pdf`);
            setDone(true);
        } catch (err) {
      if (wasCancelled(err, signal)) return;
            setError(errorMessage(err, "An unexpected error occurred."));
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10">
            {/* Header — one copy, outside the branches. It used to be
                duplicated in both the empty and the configured state. */}
            <div className="text-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-purple-50 dark:bg-cyan-950/60 border border-purple-200 dark:border-cyan-800/40 flex items-center justify-center mb-3 text-purple-900 dark:text-cyan-400">
                    <LockOpen className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-fg tracking-tight px-2">
                    Unlock PDF
                </h1>
                <p className="text-muted text-[13px] sm:text-sm mt-1.5 max-w-xs sm:max-w-lg mx-auto leading-relaxed">
                    {file
                        ? "Enter the document password to remove protection."
                        : "Remove password protection from your secure PDF documents easily."}
                </p>
            </div>

            {!file ? (
                <div className="space-y-4">
                    <UploadCard
                        onFiles={handleFile}
                        title="Click to browse or drag & drop a PDF"
                        hint="Supports text documents and reports"
                    />

                    {error && (
                        <div className="p-3.5 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-[13px] sm:text-sm font-semibold text-center">
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <form onSubmit={handleUnlock} className="space-y-4 sm:space-y-6">
                    {/* File summary */}
                    <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-100 dark:bg-cyan-500/10 text-purple-900 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-cyan-500/20">
                                <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-fg text-[13px] sm:text-sm font-bold truncate">{file.name}</p>
                                <p className="text-muted text-[11px] sm:text-xs mt-0.5 truncate">
                                    Size: <strong className="text-fg">{file.size}</strong>
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={clearFile}
                            className="p-2 sm:p-2.5 rounded-xl bg-[var(--secondary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors shrink-0"
                            title="Remove file"
                        >
                            <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        </button>
                    </div>

                    {/* Password */}
                    <div className="bg-card border border-card rounded-2xl p-4 sm:p-5 shadow-sm space-y-2">
                        <label className="text-[10px] sm:text-xs text-muted block font-semibold uppercase tracking-wider">
                            Document Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError("");
                                }}
                                placeholder="Enter current password"
                                autoComplete="off"
                                className="w-full px-4 py-3.5 sm:py-3 pr-12 rounded-xl border border-card bg-card text-base sm:text-sm text-fg focus:outline-none focus:border-purple-900 dark:focus:border-cyan-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--primary)] hover:text-[var(--primary-hover)]"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
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
                            className="w-full sm:w-auto py-3.5 sm:py-4 px-6 sm:px-8 rounded-2xl border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--secondary)] font-bold text-sm transition-colors"
                        >
                            Select Different File
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !file || !password}
                            className="w-full sm:flex-1 py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="animate-spin shrink-0" size={18} />
                                    Unlocking PDF...
                                </>
                            ) : (
                                <>
                                    <Download className="shrink-0" size={18} />
                                    {done ? "Download Unlocked PDF Again" : "Unlock and Download PDF"}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            )}

            <SecureNote />
        </div>
    );
}