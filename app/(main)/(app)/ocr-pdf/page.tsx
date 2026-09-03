"use client";

import { useState} from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { FileText, X, Copy, ScanText } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function OcrPdfPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { begin, cancel } = useCancellableRun();
    const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [extractedText, setExtractedText] = useState<string | null>(null);
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
            setError("Please upload a valid PDF file.");
            return;
        }
        setError(null);
        setSelectedFile(f);
        setFileMeta({ name: f.name, size: formatSize(f.size) });
        setExtractedText(null);
    };

    const handleOcrScan = async () => {
      const signal = begin();
        if (!selectedFile) return;

        setProcessing(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            // Updated to match your API route folder structure: app/api/AI tools/ocr/route.ts
            const res = await fetch("/api/ocr", {
  method: "POST",
  body: formData, signal });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to extract text from document.");
            }

            const resultText = data.text || data.extractedText || JSON.stringify(data, null, 2);
            setExtractedText(resultText);
        } catch (err) {
      if (wasCancelled(err, signal)) return;
            setError(errorMessage(err, "Something went wrong connecting to the server."));
        } finally {
            setProcessing(false);
        }
    };

    const handleCopy = () => {
        if (!extractedText) return;
        navigator.clipboard.writeText(extractedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <div className="text-center mb-10">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-900/30 flex items-center justify-center mb-4 border border-purple-500/20">
                    <ScanText className="text-[var(--primary)]" size={26} />
                </div>
                <h1 className="text-2xl font-bold text-fg">OCR PDF Scanner</h1>
                <p className="text-muted text-sm mt-1">Extract searchable text from scanned PDFs instantly using AI.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                    {error}
                </div>
            )}

            {!fileMeta ? (
                <UploadCard
                    onFiles={handleFile}
                    title={"Drag & drop a scanned PDF file here"}
                    hint={"or click to browse"}
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card">
                        <div className="w-9 h-9 rounded-lg bg-purple-900/30 flex items-center justify-center shrink-0">
                            <FileText size={16} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-fg text-sm truncate">{fileMeta.name}</p>
                            <p className="text-muted text-xs">{fileMeta.size}</p>
                        </div>
                        <button 
                            onClick={() => { cancel(); setSelectedFile(null); setFileMeta(null); setExtractedText(null); setError(null); }} 
                            className="text-muted hover:text-[var(--primary)] shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {extractedText && (
                        <div className="mt-6 p-5 rounded-2xl bg-card border border-card">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-fg font-semibold text-sm flex items-center gap-2">
                                    <ScanText size={14} className="text-[var(--primary)]" />
                                    Extracted Text
                                </h3>
                                <button onClick={handleCopy} className="text-muted hover:text-[var(--primary)] flex items-center gap-1 text-xs">
                                    <Copy size={13} />
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-lg bg-black/20 p-4 border border-white/5">
                                <pre className="text-xs text-fg whitespace-pre-wrap font-mono leading-relaxed">
                                    {extractedText}
                                </pre>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        {!extractedText ? (
                            <button
                                onClick={handleOcrScan}
                                disabled={processing}
                                className="px-8 py-3 rounded-full bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-colors disabled:opacity-60 shadow-lg shadow-purple-900/20"
                            >
                                {processing ? "Scanning Document..." : "Run OCR Extraction"}
                            </button>
                        ) : (
                            <button
                                onClick={handleOcrScan}
                                disabled={processing}
                                className="px-8 py-3 rounded-full bg-[var(--background-secondary)] text-fg font-medium hover:opacity-80 transition-colors disabled:opacity-60 border border-white/10"
                            >
                                {processing ? "Rescanning..." : "Scan Again"}
                            </button>
                        )}
                    </div>
                </>
            )}

            <SecureNote />
        </div>
    );
}