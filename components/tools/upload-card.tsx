"use client";

import { useRef, useState } from "react";
import { Upload, X, FileText, ShieldCheck } from "lucide-react";

/**
 * Standardized upload area used across all PDF tools.
 * Provides clean drag-and-drop, prominent primary button, and responsive layout.
 */
export function UploadCard({
    onFiles,
    accept = "application/pdf",
    multiple = false,
    title = "Drag & drop your files here",
    hint = "or click to browse from your device",
    disabled = false,
}: {
    onFiles: (files: FileList | null) => void;
    accept?: string;
    multiple?: boolean;
    title?: string;
    hint?: string;
    disabled?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    const open = () => {
        if (!disabled) inputRef.current?.click();
    };

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            onClick={open}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                }
            }}
            onDragOver={(e) => {
                e.preventDefault();
                if (!disabled) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (!disabled) onFiles(e.dataTransfer.files);
            }}
            className={`group mx-auto w-full max-w-[640px] rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                disabled
                    ? "cursor-not-allowed opacity-60 border-border bg-muted/40"
                    : dragging
                        ? "cursor-pointer border-primary bg-primary/10 shadow-md scale-[1.01]"
                        : "cursor-pointer border-border/80 bg-card hover:border-primary/60 hover:bg-muted/30 shadow-xs hover:shadow-sm"
            }`}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                hidden
                onChange={(e) => {
                    onFiles(e.target.files);
                    // Let the same file be picked twice in a row.
                    e.target.value = "";
                }}
            />

            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-primary/10 dark:bg-primary/20 text-primary dark:text-blue-400 shadow-xs transition-transform duration-200 group-hover:scale-105">
                <Upload size={24} />
            </div>

            <p className="text-base sm:text-lg font-bold text-foreground">{title}</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">{hint}</p>

            <div className="mt-5">
                <span className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition-all group-hover:bg-primary/90">
                    <Upload size={16} />
                    Choose Files
                </span>
            </div>
        </div>
    );
}

/**
 * Reassurance security note shown below upload zones.
 */
export function SecureNote() {
    return (
        <div className="pt-6 flex flex-wrap items-center justify-center gap-2 text-center text-muted-foreground text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>256-bit SSL encryption • Files processed securely and deleted automatically</span>
        </div>
    );
}

/** The selected-file row that sits where the upload card was. */
export function FileChip({
    name,
    size,
    onRemove,
}: {
    name: string;
    size?: string;
    onRemove?: () => void;
}) {
    return (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                <FileText size={18} />
            </div>
            <div className="flex-1 min-w-0 text-left">
                <p className="text-foreground text-sm font-semibold truncate">{name}</p>
                {size && <p className="text-muted-foreground text-xs mt-0.5">{size}</p>}
            </div>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`Remove ${name}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-muted transition-colors shrink-0"
                >
                    <X size={16} />
                </button>
            )}
        </div>
    );
}