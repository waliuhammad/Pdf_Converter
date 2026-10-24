"use client";

import { useState } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { Languages, Sparkles, Copy, Loader2, FileText, X, ArrowRight, Download, CheckCircle2 } from "lucide-react";
import LanguageSelect from "@/components/language-select";
import { errorMessage } from "@/lib/errors";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";
import { downloadBlob } from "@/lib/download";

export default function PdfTranslatorPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { begin, cancel } = useCancellableRun();
    const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);
    const [targetLang, setTargetLang] = useState("Spanish");
    const [outputFormat, setOutputFormat] = useState<"text" | "pdf">("text");

    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [translatedPdfBlob, setTranslatedPdfBlob] = useState<Blob | null>(null);
    const [downloadFilename, setDownloadFilename] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleFile = (fileList: FileList | null) => {
        if (!fileList || fileList.length === 0) return;
        const f = fileList[0];
        if (f.type !== "application/pdf") {
            setError("Please upload a valid PDF document.");
            return;
        }
        setError(null);
        setSelectedFile(f);
        setFileMeta({ name: f.name, size: formatSize(f.size) });
        setTranslatedText(null);
        setTranslatedPdfBlob(null);
        setDownloadFilename(null);
    };

    const handleTranslate = async (e: React.FormEvent) => {
        const signal = begin();
        e.preventDefault();
        if (!selectedFile || loading) return;

        setLoading(true);
        setError(null);
        setTranslatedText(null);
        setTranslatedPdfBlob(null);
        setDownloadFilename(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("language", targetLang);
            formData.append("outputFormat", outputFormat);

            const res = await fetch("/api/translate", {
                method: "POST",
                body: formData,
                signal,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to translate the document.");
            }

            if (outputFormat === "pdf") {
                const blob = await res.blob();
                const baseName = selectedFile.name.replace(/\.[^/.]+$/, "") || "document";
                const cleanLang = targetLang.toLowerCase().replace(/[^a-z0-9]+/g, "_");
                const filename = `${baseName}_${cleanLang}.pdf`;
                setTranslatedPdfBlob(blob);
                setDownloadFilename(filename);
                downloadBlob(blob, filename);
            } else {
                const data = await res.json();
                const result = data.result?.translatedText ?? data.translatedText ?? "";
                setTranslatedText(result);
            }
        } catch (err) {
            if (wasCancelled(err, signal)) return;
            setError(errorMessage(err, "Something went wrong connecting to the server."));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const resetAll = () => {
        cancel();
        setSelectedFile(null);
        setFileMeta(null);
        setTranslatedText(null);
        setTranslatedPdfBlob(null);
        setDownloadFilename(null);
        setError(null);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                    <Languages className="text-[var(--primary)]" size={26} />
                </div>
                <h1 className="text-2xl font-bold text-fg">AI PDF Translator</h1>
                <p className="text-muted text-sm mt-1">
                    Upload a PDF document to translate its contents into your desired language.
                </p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {!fileMeta ? (
                <UploadCard
                    onFiles={handleFile}
                    title={"Drag & drop your PDF here"}
                    hint={"or click to browse files"}
                />
            ) : (
                <form onSubmit={handleTranslate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Upload & Config Panel */}
                    <div className="flex flex-col rounded-2xl bg-card border border-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-4">
                            <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Upload Document
                            </label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Output: Text | PDF Selector */}
                                <div className="inline-flex items-center bg-muted/80 border border-border rounded-xl p-1 text-xs">
                                    <span className="text-[11px] font-semibold text-muted px-1.5">Output:</span>
                                    <button
                                        type="button"
                                        onClick={() => setOutputFormat("text")}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                            outputFormat === "text"
                                                ? "bg-[var(--primary)] text-primary-foreground shadow-sm"
                                                : "text-muted hover:text-fg"
                                        }`}
                                    >
                                        Text
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOutputFormat("pdf")}
                                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                            outputFormat === "pdf"
                                                ? "bg-[var(--primary)] text-primary-foreground shadow-sm"
                                                : "text-muted hover:text-fg"
                                        }`}
                                    >
                                        PDF
                                    </button>
                                </div>
                                <LanguageSelect value={targetLang} onChange={setTargetLang} />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted border border-border">
                                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    <FileText size={16} className="text-[var(--primary)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-fg text-sm truncate">{fileMeta.name}</p>
                                    <p className="text-muted text-xs">{fileMeta.size}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetAll}
                                    className="text-muted hover:text-[var(--primary)] shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="mt-4 text-center text-xs text-muted">
                                Ready to translate into <strong className="text-fg">{targetLang}</strong> ({outputFormat.toUpperCase()} output).
                            </div>
                        </div>

                        <div className="pt-3 border-t border-border mt-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={loading || !selectedFile}
                                className="px-6 py-2.5 rounded-full bg-[var(--primary)] text-primary-foreground text-sm font-medium hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        {outputFormat === "pdf" ? "Translating PDF Layout..." : "Translating..."}
                                    </>
                                ) : (
                                    <>
                                        {outputFormat === "pdf" ? "Translate to PDF" : "Translate PDF"}
                                        <ArrowRight size={15} />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Output Panel */}
                    <div className="flex flex-col rounded-2xl bg-card border border-card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles size={13} className="text-[var(--primary)]" />
                                {outputFormat === "pdf" ? "Translated PDF" : "Translated Result"}
                            </span>
                            {outputFormat === "text" && translatedText && (
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="text-muted hover:text-[var(--primary)] flex items-center gap-1 text-xs"
                                >
                                    <Copy size={13} />
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            )}
                            {outputFormat === "pdf" && translatedPdfBlob && downloadFilename && (
                                <button
                                    type="button"
                                    onClick={() => downloadBlob(translatedPdfBlob, downloadFilename)}
                                    className="text-[var(--primary)] hover:underline flex items-center gap-1 text-xs font-semibold"
                                >
                                    <Download size={13} />
                                    Download Again
                                </button>
                            )}
                        </div>

                        <div className="w-full flex-1 rounded-lg bg-muted p-4 border border-border overflow-y-auto max-h-[300px] min-h-[200px] flex flex-col justify-center">
                            {outputFormat === "text" ? (
                                translatedText ? (
                                    <p className="text-sm text-fg whitespace-pre-wrap leading-relaxed self-start">
                                        {translatedText}
                                    </p>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-center text-muted text-xs">
                                        Translation output will appear here...
                                    </div>
                                )
                            ) : translatedPdfBlob && downloadFilename ? (
                                <div className="flex flex-col items-center justify-center text-center p-3">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-2.5">
                                        <CheckCircle2 size={24} />
                                    </div>
                                    <p className="text-sm font-bold text-fg mb-1 truncate max-w-full">
                                        {downloadFilename}
                                    </p>
                                    <p className="text-xs text-muted mb-4 max-w-xs leading-relaxed">
                                        PDF translated into {targetLang}. Original layout, graphics, backgrounds and colors are preserved.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => downloadBlob(translatedPdfBlob, downloadFilename)}
                                        className="px-5 py-2.5 rounded-full bg-[var(--primary)] text-primary-foreground text-xs font-semibold hover:opacity-90 flex items-center gap-2 shadow-md transition-all"
                                    >
                                        <Download size={14} />
                                        Download {downloadFilename}
                                    </button>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center text-muted text-xs">
                                    Translated PDF document will appear here for download...
                                </div>
                            )}
                        </div>

                        <div className="pt-3 border-t border-border mt-3 flex justify-end">
                            <span className="text-xs text-muted">Powered by AI</span>
                        </div>
                    </div>
                </form>
            )}

            <SecureNote />
        </div>
    );
}