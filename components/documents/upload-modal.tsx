"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { X, Upload, FileText, CheckCircle2, Loader2 } from "lucide-react";

interface UploadFile {
    id: string;
    file: File;
    progress: number;
    status: "uploading" | "done" | "error";
}

interface UploadModalProps {
    onClose: () => void;
    onUploadComplete: (files: { name: string; size: string; bytes: number }[]) => void;
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const formatSize = (bytes: number) => {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const handleFiles = (fileList: FileList) => {
        const pdfFiles = Array.from(fileList).filter((f) => f.type === "application/pdf");
        if (pdfFiles.length === 0) return;

        const newFiles: UploadFile[] = pdfFiles.map((file) => ({
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            file,
            progress: 0,
            status: "uploading",
        }));

        setFiles((prev) => [...prev, ...newFiles]);

        // Simulate upload progress for each file
        newFiles.forEach((uf) => simulateUpload(uf.id));
    };

    const simulateUpload = (id: string) => {
        const interval = setInterval(() => {
            setFiles((prev) =>
                prev.map((f) => {
                    if (f.id !== id) return f;
                    const next = Math.min(f.progress + Math.random() * 25, 100);
                    if (next >= 100) {
                        clearInterval(interval);
                        return { ...f, progress: 100, status: "done" };
                    }
                    return { ...f, progress: next };
                })
            );
        }, 300);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleFiles(e.target.files);
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const allDone = files.length > 0 && files.every((f) => f.status === "done");

    const handleFinish = () => {
        const completed = files
            .filter((f) => f.status === "done")
            .map((f) => ({ name: f.file.name, size: formatSize(f.file.size), bytes: f.file.size }));
        onUploadComplete(completed);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card  rounded-2xl border border-card p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-fg">Upload PDF</h2>
                    <button onClick={onClose} className="text-muted hover:text-fg p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Drop zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    // Same as the split and compress drop zones: a div with an
                    // onClick cannot be reached from the keyboard, and neither
                    // can the hidden input behind it.
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            inputRef.current?.click();
                        }
                    }}
                    className={`flex flex-col items-center justify-center gap-2 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${dragActive ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-card"
                        }`}
                >
                    <Upload size={28} className="text-[var(--primary)]" />
                    <p className="text-sm text-fg font-medium">Drag & drop PDF files here</p>
                    <p className="text-xs text-muted">or click to browse (PDF only)</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        className="hidden"
                        onChange={handleInputChange}
                    />
                </div>

                {/* File list */}
                {files.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                        {files.map((f) => (
                            <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-card">
                                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                    <FileText size={16} className="text-[var(--primary)]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-fg truncate">{f.file.name}</p>
                                    <div className="w-full h-1.5 rounded-full bg-[var(--background-secondary)] overflow-hidden mt-1.5">
                                        <div
                                            className="h-full rounded-full bg-[var(--primary)] transition-all"
                                            style={{ width: `${f.progress}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {f.status === "done" ? (
                                        <CheckCircle2 size={18} className="text-green-600" />
                                    ) : (
                                        <Loader2 size={18} className="text-muted animate-spin" />
                                    )}
                                </div>
                                <button onClick={() => removeFile(f.id)} className="text-muted hover:text-fg shrink-0">
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-full border border-card text-sm text-fg hover:border-[var(--primary)] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleFinish}
                        disabled={!allDone}
                        className="px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {files.length === 0 ? "Select files first" : allDone ? "Done" : "Uploading..."}
                    </button>
                </div>
            </div>
        </div>
    );
}