"use client";

/**
 * ResultPdfPreview
 *
 * Shows a scrollable, embedded PDF viewer for the processed/output PDF blob
 * (or URL) produced by any tool.  A "Download" button sits below the viewer.
 *
 * Props
 * ─────
 * blob        – The processed PDF Blob (preferred; revoked automatically).
 * url         – A stable Object-URL you manage yourself.
 * filename    – Suggested filename for the download button.
 * label       – Optional heading shown above the viewer (default: "Preview Result").
 * onDownload  – Optional override for the download action.
 * className   – Extra classes on the outer wrapper.
 */

import { useEffect, useMemo, useState } from "react";
import { Download, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { downloadBlob } from "@/lib/download";

interface ResultPdfPreviewProps {
  blob?: Blob | null;
  url?: string | null;
  filename: string;
  label?: string;
  onDownload?: () => void;
  className?: string;
}

export function ResultPdfPreview({
  blob,
  url: externalUrl,
  filename,
  label = "Preview Result",
  onDownload,
  className = "",
}: ResultPdfPreviewProps) {
  // Create an object URL from the blob; revoke when blob changes.
  const blobUrl = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blob]
  );
  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const pdfUrl = blobUrl ?? externalUrl ?? null;

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Reset when source changes.
  useEffect(() => {
    setPage(1);
    setTotalPages(null);
    setIframeLoaded(false);
  }, [pdfUrl]);

  // Detect page count from the blob via pdfjs (best-effort).
  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    (async () => {
      try {
        const { loadPdfjs } = await import("@/lib/pdf-libs");
        const pdfjsLib = await loadPdfjs();
        const arrayBuffer = await blob.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (!cancelled) setTotalPages(doc.numPages);
      } catch {
        /* not critical */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  const pageFragment = `#page=${page}&toolbar=0&navpanes=0&scrollbar=1`;
  const viewerUrl = pdfUrl ? `${pdfUrl}${pageFragment}` : null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (blob) {
      downloadBlob(blob, filename);
    } else if (externalUrl) {
      const a = document.createElement("a");
      a.href = externalUrl;
      a.download = filename;
      a.click();
    }
  };

  if (!pdfUrl) return null;

  return (
    <div
      className={`rounded-2xl border border-foreground/15 bg-[var(--background-secondary)] shadow-md overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10">
        <div className="flex items-center gap-2 text-foreground">
          <Eye size={16} className="text-primary" />
          <span className="text-sm font-bold">{label}</span>
        </div>

        {totalPages !== null && totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-foreground/15 text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-all"
              title="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-semibold text-foreground/70 min-w-[56px] text-center">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-foreground/15 text-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 transition-all"
              title="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Viewer */}
      <div className="relative bg-muted" style={{ minHeight: 420 }}>
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        )}
        <object
          key={viewerUrl}
          data={viewerUrl ?? ""}
          type="application/pdf"
          className="w-full"
          style={{ height: 480 }}
          onLoad={() => setIframeLoaded(true)}
        >
          {/* Fallback for browsers that do not embed PDFs */}
          <iframe
            src={viewerUrl ?? ""}
            title={label}
            className="w-full"
            style={{ height: 480, border: "none" }}
            onLoad={() => setIframeLoaded(true)}
          />
        </object>
      </div>

      {/* Download bar */}
      <div className="px-4 py-3 border-t border-foreground/10 flex items-center justify-between gap-3 bg-[var(--background-secondary)]">
        <p className="text-xs text-foreground/60 truncate max-w-[60%]">{filename}</p>
        <button
          type="button"
          onClick={handleDownload}
          className="flex items-center gap-2 py-2 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-[var(--primary-hover)] transition-colors shadow-sm shrink-0"
        >
          <Download size={15} />
          Download
        </button>
      </div>
    </div>
  );
}
