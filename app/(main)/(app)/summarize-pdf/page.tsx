"use client";

import { useState} from "react";
import { ExportButtons } from "@/components/tools/export-buttons";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { FileText, X, Copy, Sparkles } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

export default function SummarizePdfPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const { begin, cancel } = useCancellableRun();
    const [fileMeta, setFileMeta] = useState<{ name: string; size: string } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [summary, setSummary] = useState<string[] | null>(null);
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
        setSummary(null);
    };

    const handleSummarize = async () => {
      const signal = begin();
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);

    try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const res = await fetch("/api/summary", {
            method: "POST",
            body: formData, signal });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || "Failed to generate summary.");
        }

        const aiSummary = data.result.summary;

        // The model writes its points as Markdown ("* point", "- point",
        // "**bold**"); the page draws its own bullet, so those marks are
        // removed — otherwise every point read "• * point".
        const clean = (line: string) =>
            line
                .trim()
                .replace(/^([*\-•]|\d+[.)])\s+/, "")
                .replace(/\*\*(.+?)\*\*/g, "$1")
                .trim();
        const resultSummary =
            Array.isArray(aiSummary)
                ? aiSummary.map(String).map(clean).filter(Boolean)
                : typeof aiSummary === "string"
                ? aiSummary.split("\n").map(clean).filter(Boolean)
                : ["No summary returned."];

        setSummary(resultSummary);

    } catch (err) {
      if (wasCancelled(err, signal)) return;
        setError(errorMessage(err, "Something went wrong connecting to the server."));
    } finally {
        setProcessing(false);
    }
};
    const handleCopy = () => {
        if (!summary) return;
        navigator.clipboard.writeText(summary.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center mb-4 border border-primary/20 text-primary dark:text-blue-400 shadow-xs animate-icon-pulse">
                    <Sparkles className="text-[var(--primary)]" size={26} />
                </div>
                <h1 className="text-2xl font-bold text-fg">Summarize PDF</h1>
                <p className="text-muted text-sm mt-1">Get an AI-generated summary of your document in seconds.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-100/50 border border-red-200 text-red-600 text-sm text-center">
                    {error}
                </div>
            )}

            {!fileMeta ? (
                <UploadCard
                    onFiles={handleFile}
                    title={"Drag & drop a PDF file here"}
                    hint={"or click to browse"}
                />
            ) : (
                <>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-card">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center shrink-0 text-primary dark:text-blue-400">
                            <FileText size={16} className="text-[var(--primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-fg text-sm truncate">{fileMeta.name}</p>
                            <p className="text-muted text-xs">{fileMeta.size}</p>
                        </div>
                        <button 
                            onClick={() => { cancel(); setSelectedFile(null); setFileMeta(null); setSummary(null); setError(null); }} 
                            className="text-muted hover:text-[var(--primary)] shrink-0"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {summary && (
                        <div className="mt-6 p-5 rounded-2xl bg-card border border-card">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-fg font-semibold text-sm flex items-center gap-2">
                                    <Sparkles size={14} className="text-[var(--primary)]" />
                                    AI Summary
                                </h3>
                                <button onClick={handleCopy} className="text-muted hover:text-[var(--primary)] flex items-center gap-1 text-xs">
                                    <Copy size={13} />
                                    {copied ? "Copied" : "Copy"}
                                </button>
                            </div>
                            <ul className="space-y-2">
                                {summary.map((line, i) => (
                                    <li key={i} className="text-sm text-fg leading-relaxed flex gap-2">
                                        <span className="text-[var(--primary)]">•</span>
                                        <span>{line}</span>
                                    </li>
                                ))}
                            </ul>
                            <ExportButtons
                                data={{
                                    title: "AI Summary",
                                    sourceName: fileMeta.name,
                                    suffix: "summary",
                                    content: { bullets: summary },
                                }}
                            />
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        {!summary ? (
                            <button
                                onClick={handleSummarize}
                                disabled={processing}
                                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] hover:border-[var(--primary-hover)] text-[var(--primary-foreground)] font-bold text-sm sm:text-base shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                            >
                                {processing ? "Summarizing..." : "Summarize with AI"}
                            </button>
                        ) : (
                            <button
                                onClick={handleSummarize}
                                disabled={processing}
                                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-card border border-border hover:bg-muted text-foreground font-bold text-sm sm:text-base disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
                            >
                                {processing ? "Regenerating..." : "Regenerate Summary"}
                            </button>
                        )}
                    </div>
                </>
            )}

            <SecureNote />
        </div>
    );
}