"use client";

import {
  FileText,
  Layers,
  Download,
  Loader2,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Eye,
  Maximize2,
  RotateCw,
  RotateCcw,
  GripVertical,
  ArrowDownAZ,
  ArrowUpZA,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { downloadBlob } from "@/lib/download";
import { loadPdfLib } from "@/lib/pdf-libs";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

interface PDFSourceFile {
  fileIndex: number;
  file: File;
  name: string;
  size: string;
  sizeBytes: number;
  pageCount: number;
}

interface PageItem {
  id: string;
  fileIndex: number;
  fileName: string;
  localPageIndex: number;
  rotation: number;
}

export default function MergePdfPage() {
  const [sourceFiles, setSourceFiles] = useState<PDFSourceFile[]>([]);
  const { begin, cancel } = useCancellableRun();
  const [pagesList, setPagesList] = useState<PageItem[]>([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draggedFileIndex, setDraggedFileIndex] = useState<number | null>(null);
  const [dragOverFileIndex, setDragOverFileIndex] = useState<number | null>(null);

  // Controls whether the source-files list is expanded or collapsed into a
  // dropdown header. Only relevant once there are 3+ files — below that
  // threshold the list is always shown and the container just hugs its
  // content height instead of reserving fixed empty space.
  const [isFileListExpanded, setIsFileListExpanded] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextFileIndex = useRef(0);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFilesAdded = async (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;

    const newSourceFiles = [...sourceFiles];
    const newPagesList = [...pagesList];
    const rejected: string[] = [];

    const unreadable: string[] = [];
    const { PDFDocument } = await loadPdfLib();

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) continue;

      try {
        const buffer = await file.arrayBuffer();

        // The page count used to come from counting "/Type /Page" in the raw
        // bytes, which finds nothing when pages sit inside compressed object
        // streams (most modern PDFs) and so offered one page for a 20-page
        // file. Parsing the document gives the real number.
        let pdf;
        try {
          pdf = await PDFDocument.load(buffer, { ignoreEncryption: true, updateMetadata: false });
        } catch {
          unreadable.push(file.name);
          continue;
        }

        // A locked PDF handed to the preview makes the browser's own viewer
        // draw a password prompt, and that prompt is wider than this panel, so
        // it appeared cut in half with a scrollbar under it. It could not be
        // merged either — the encrypted file is refused when the pages are
        // copied — so it is turned away here with a reason instead.
        if (pdf.isEncrypted) {
          rejected.push(file.name);
          continue;
        }

        const pageCount = pdf.getPageCount();
        if (pageCount === 0) {
          unreadable.push(file.name);
          continue;
        }

        // Ids are never reused: deriving them from the list length gave a new
        // file the same id as one still on the list after another was removed.
        const currentFileIndex = nextFileIndex.current++;

        newSourceFiles.push({
          fileIndex: currentFileIndex,
          file,
          name: file.name,
          size: formatSize(file.size),
          sizeBytes: file.size,
          pageCount,
        });

        for (let p = 0; p < pageCount; p++) {
          newPagesList.push({
            id: `${currentFileIndex}-${p}-${Math.random().toString(36).substring(2, 6)}`,
            fileIndex: currentFileIndex,
            fileName: file.name,
            localPageIndex: p,
            rotation: 0,
          });
        }
      } catch (err) {
        if (wasCancelled(err)) return;
        console.error("Error reading PDF:", err);
      }
    }

    const notices: string[] = [];
    if (rejected.length > 0) {
      notices.push(
        `${rejected.join(", ")} ${rejected.length === 1 ? "is" : "are"} password protected and cannot be merged. Remove the password with the Unlock PDF tool first.`
      );
    }
    if (unreadable.length > 0) {
      notices.push(`${unreadable.join(", ")} could not be read as ${unreadable.length === 1 ? "a PDF" : "PDFs"}.`);
    }
    const lockedNotice = notices.length > 0 ? notices.join(" ") : null;

    if (newSourceFiles.length === 0) {
      setErrorMessage(lockedNotice ?? "Please select valid PDF files.");
      return;
    }

    setSourceFiles(newSourceFiles);
    setPagesList(newPagesList);
    // Keeps the reason on screen when some files were added and others were
    // turned away, rather than silently dropping them.
    setErrorMessage(lockedNotice);
    setActivePreviewIndex(0);
  };

  const jumpToFile = (fileIndex: number) => {
    const targetPageIndex = pagesList.findIndex((p) => p.fileIndex === fileIndex);
    if (targetPageIndex !== -1) {
      setActivePreviewIndex(targetPageIndex);
    }
  };

  /** Rebuild pagesList to follow a new source-file order. */
  const applyFileOrder = (orderedFiles: PDFSourceFile[]) => {
    setSourceFiles(orderedFiles);

    const newPagesList: PageItem[] = [];
    orderedFiles.forEach((sf) => {
      const matchingPages = pagesList.filter((p) => p.fileIndex === sf.fileIndex);
      newPagesList.push(...matchingPages);
    });
    setPagesList(newPagesList);
  };

  /**
   * Touch-friendly reordering. HTML5 drag-and-drop never fires on touch
   * screens — on a phone, dragging a card just scrolls the page — so these
   * buttons are the only way to reorder on mobile (and a discoverable
   * alternative to dragging on desktop).
   */
  const moveFile = (fileIndex: number, direction: "up" | "down") => {
    const currentIdx = sourceFiles.findIndex((f) => f.fileIndex === fileIndex);
    if (currentIdx === -1) return;

    const targetIdx = direction === "up" ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= sourceFiles.length) return;

    const updated = [...sourceFiles];
    [updated[currentIdx], updated[targetIdx]] = [updated[targetIdx], updated[currentIdx]];
    applyFileOrder(updated);
  };

  const handleDragStart = (e: React.DragEvent, fileIndex: number) => {
    setDraggedFileIndex(fileIndex);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetFileIndex: number) => {
    e.preventDefault();
    if (draggedFileIndex === null || draggedFileIndex === targetFileIndex) return;
    setDragOverFileIndex(targetFileIndex);
  };

  const handleDrop = (e: React.DragEvent, targetFileIndex: number) => {
    e.preventDefault();
    if (draggedFileIndex === null || draggedFileIndex === targetFileIndex) {
      setDraggedFileIndex(null);
      setDragOverFileIndex(null);
      return;
    }

    const updatedSourceFiles = [...sourceFiles];
    const draggedIdx = updatedSourceFiles.findIndex((f) => f.fileIndex === draggedFileIndex);
    const targetIdx = updatedSourceFiles.findIndex((f) => f.fileIndex === targetFileIndex);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const [movedFile] = updatedSourceFiles.splice(draggedIdx, 1);
    updatedSourceFiles.splice(targetIdx, 0, movedFile);

    applyFileOrder(updatedSourceFiles);
    setDraggedFileIndex(null);
    setDragOverFileIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedFileIndex(null);
    setDragOverFileIndex(null);
  };

  const removeFile = (fileIndex: number) => {
    // Removing the file stops whatever it was being used for.
    cancel();
    const updatedSourceFiles = sourceFiles.filter((f) => f.fileIndex !== fileIndex);
    const updatedPagesList = pagesList.filter((p) => p.fileIndex !== fileIndex);

    setSourceFiles(updatedSourceFiles);
    setPagesList(updatedPagesList);

    if (updatedPagesList.length > 0) {
      setActivePreviewIndex(0);
    }
  };

  const rotatePage = (index: number, direction: "cw" | "ccw") => {
    const currentPage = pagesList[index];
    if (!currentPage) return;

    const delta = direction === "cw" ? 90 : -90;
    // A new object rather than a mutation, so React sees the change.
    setPagesList(
      pagesList.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + delta) % 360 } : p))
    );
  };

  /** Turns every page of one file by 90° clockwise. */
  const rotateFile = (fileIndex: number) => {
    setPagesList(
      pagesList.map((p) => (p.fileIndex === fileIndex ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  /** Orders the files by name (A→Z, then Z→A on the next click). */
  const sortFilesByName = () => {
    const sorted = [...sourceFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
    if (sortDirection === "desc") sorted.reverse();
    applyFileOrder(sorted);
    setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    setActivePreviewIndex(0);
  };

  const removePage = (id: string) => {
    const updated = pagesList.filter((p) => p.id !== id);
    setPagesList(updated);
    if (activePreviewIndex >= updated.length) {
      setActivePreviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const clearAll = () => {
    setSourceFiles([]);
    setPagesList([]);
    setActivePreviewIndex(0);
    setErrorMessage(null);
  };

  const totalOriginalSize = sourceFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
  const estimatedFinalSize = formatSize(totalOriginalSize * 0.95);

  const executeMerge = async () => {
    const signal = begin();
    if (sourceFiles.length < 2) {
      setErrorMessage("Please upload at least 2 PDF files in order to merge documents.");
      return;
    }

    if (pagesList.length < 2) {
      setErrorMessage("Please keep at least 2 pages in your merged document.");
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      // The server reads pageOrder[].fileIndex as a position in the uploaded
      // list. The page's own ids are not positions once files have been
      // reordered or removed, so they are translated here — and only files
      // that still contribute a page are uploaded.
      const formData = new FormData();
      const uploadPosition = new Map<number, number>();
      sourceFiles.forEach((sf) => {
        if (!pagesList.some((p) => p.fileIndex === sf.fileIndex)) return;
        uploadPosition.set(sf.fileIndex, uploadPosition.size);
        formData.append("files", sf.file);
      });

      const pageOrderPayload = pagesList.map((p) => ({
        fileIndex: uploadPosition.get(p.fileIndex) ?? 0,
        pageIndex: p.localPageIndex,
        rotation: p.rotation,
      }));
      formData.append("pageOrder", JSON.stringify(pageOrderPayload));

      const response = await fetch("/api/merge-pdf", {
        method: "POST",
        body: formData,
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || "Failed to merge PDFs.");
        return;
      }

      const blob = await response.blob();
      if (signal.aborted) return;
      downloadBlob(blob, "merged.pdf");
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setErrorMessage("An error occurred while merging your PDF files.");
    } finally {
      if (!signal.aborted) setProcessing(false);
    }
  };

  const activePage = pagesList[activePreviewIndex];
  const activeSourceFile = activePage ? sourceFiles.find((f) => f.fileIndex === activePage.fileIndex) : null;
  // One object URL per file, released when it changes. Creating it during
  // render made a new URL (and kept the old one alive) on every re-render.
  const activeFile = activeSourceFile?.file ?? null;
  const activeFileUrl = useMemo(() => (activeFile ? URL.createObjectURL(activeFile) : ""), [activeFile]);
  useEffect(() => () => {
    if (activeFileUrl) URL.revokeObjectURL(activeFileUrl);
  }, [activeFileUrl]);
  const activePreviewUrl = activeFileUrl && activePage
    ? `${activeFileUrl}#page=${activePage.localPageIndex + 1}&view=FitH,top&scrollbar=1&toolbar=0&navpanes=0`
    : "";

  // Once there are 3+ files, the list becomes a collapsible dropdown so it
  // doesn't keep growing forever; below that it's always shown in full.
  const isCollapsible = sourceFiles.length >= 3;
  const isListVisible = !isCollapsible || isFileListExpanded;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 py-8 text-foreground bg-background transition-colors">
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 shadow-inner bg-[var(--background-secondary)] border border-foreground/20 text-foreground"
        >
          <Layers size={28} />
        </div>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">Merge, Rotate & Reorder PDF Pages</h1>
        <p className="text-foreground/70 text-sm mt-1.5 max-w-lg mx-auto">
          Visually inspect layout structure, preview clear pages in large format with native scrolling, rotate pages in both directions, and sequence your final PDF output.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        hidden
        onChange={(e) => {
          // Copied first: clearing the input below empties its FileList.
          handleFilesAdded(e.target.files ? Array.from(e.target.files) : null);
          // Lets the same file be picked again after it was removed.
          e.target.value = "";
        }}
      />

      {sourceFiles.length === 0 ? (
        <UploadCard
          onFiles={handleFilesAdded}
          multiple
          title="Click to browse or drag & drop PDFs"
          hint="Upload multiple documents to start combining and re-sequencing pages"
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Card */}
          <div
            className={`lg:col-span-5 border border-foreground/15 rounded-3xl p-4 shadow-sm flex flex-col bg-[var(--background-secondary)] text-foreground transition-all duration-200 ${isCollapsible ? "max-h-[600px]" : "h-auto"
              }`}
          >
            <div
              className={`flex items-center justify-between border-foreground/10 ${isListVisible ? "pb-3 mb-3 border-b" : "pb-1"
                } ${isCollapsible ? "cursor-pointer select-none" : ""}`}
              onClick={() => {
                if (isCollapsible) setIsFileListExpanded((prev) => !prev);
              }}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-foreground/70 flex items-center gap-1.5">
                Source Files ({sourceFiles.length})
                {isCollapsible && (
                  isFileListExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                )}
              </span>
              <div className="flex items-center gap-1.5">
                {sourceFiles.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      sortFilesByName();
                    }}
                    className="py-1 px-2 rounded-lg border border-foreground/10 bg-muted text-foreground hover:bg-foreground/10 transition-colors flex items-center gap-1 text-[11px] font-semibold normal-case tracking-normal"
                    title={sortDirection === "asc" ? "Sort files by name, A to Z" : "Sort files by name, Z to A"}
                  >
                    {sortDirection === "asc" ? <ArrowDownAZ size={14} /> : <ArrowUpZA size={14} />}
                    {sortDirection === "asc" ? "A–Z" : "Z–A"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="p-1 rounded-lg border border-foreground/10 bg-muted text-foreground hover:bg-foreground/10 transition-colors"
                  title="Add More PDFs"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {isListVisible && (
              <div
                className={`space-y-3 px-2 pt-1 ${isCollapsible ? "flex-1 overflow-y-auto" : ""}`}
              >
                {sourceFiles.map((sf, listIdx) => {
                  const isSelected = activeSourceFile?.fileIndex === sf.fileIndex;
                  const isBeingDragged = draggedFileIndex === sf.fileIndex;
                  const isDragOver = dragOverFileIndex === sf.fileIndex;

                  return (
                    <div
                      key={sf.fileIndex}
                      draggable
                      onDragStart={(e) => handleDragStart(e, sf.fileIndex)}
                      onDragOver={(e) => handleDragOver(e, sf.fileIndex)}
                      onDrop={(e) => handleDrop(e, sf.fileIndex)}
                      onDragEnd={handleDragEnd}
                      onClick={() => jumpToFile(sf.fileIndex)}
                      className={`py-4 px-3 rounded-2xl border border-foreground/20 cursor-pointer transition-all flex items-center gap-2 relative group text-foreground overflow-hidden w-full box-border shadow-sm ${isSelected ? "ring-2 ring-primary bg-primary/5" : "bg-[var(--background-secondary)] hover:bg-foreground/5"
                        } ${isBeingDragged ? "opacity-40 border-dashed" : ""
                        } ${isDragOver ? "border-t-2 border-t-primary scale-[1.02]" : ""
                        }`}
                    >
                      {/* Reorder controls: arrows work everywhere including touch
                          screens, where HTML5 drag events never fire. */}
                      <div className="flex flex-col shrink-0 -my-1">
                        <button
                          type="button"
                          disabled={listIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFile(sf.fileIndex, "up");
                          }}
                          className="p-1 rounded-md text-foreground/60 hover:text-foreground disabled:opacity-20 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={listIdx === sourceFiles.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveFile(sf.fileIndex, "down");
                          }}
                          className="p-1 rounded-md text-foreground/60 hover:text-foreground disabled:opacity-20 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </div>

                      <div
                        className="cursor-grab active:cursor-grabbing p-1 shrink-0 text-foreground/50 hover:text-foreground transition-colors hidden sm:block"
                        title="Drag up or down to reorder"
                      >
                        <GripVertical size={16} />
                      </div>

                      <div className="w-9 h-9 rounded-xl border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0 text-foreground">
                        <FileText size={18} />
                      </div>

                      <div className="min-w-0 flex-1 overflow-hidden pr-1">
                        <p className="text-xs font-bold truncate text-foreground w-full tracking-tight">{sf.name}</p>
                        <p className="text-[11px] mt-0.5 text-foreground/60 font-medium">{sf.size} • {sf.pageCount} {sf.pageCount === 1 ? "page" : "pages"}</p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          rotateFile(sf.fileIndex);
                        }}
                        className="p-2 rounded-xl border border-foreground/15 bg-[var(--background-secondary)] transition-all shrink-0 text-foreground/70 hover:text-foreground hover:bg-foreground/5 shadow-sm"
                        title="Rotate all pages of this file 90°"
                        aria-label={`Rotate ${sf.name}`}
                      >
                        <RotateCw size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(sf.fileIndex);
                        }}
                        className="p-2 rounded-xl border border-foreground/15 bg-[var(--background-secondary)] transition-all shrink-0 text-foreground/70 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/50 hover:bg-red-500/10 shadow-sm"
                        title="Delete File"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Preview Panel */}
          <div className="lg:col-span-7 space-y-6">
            {pagesList.length > 0 && (
              <div
                className="border border-foreground/15 rounded-3xl p-6 shadow-md space-y-6 bg-[var(--background-secondary)] text-foreground transition-colors"
              >
                <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-foreground" />
                    <span className="text-sm font-extrabold text-foreground">Page Viewer</span>
                  </div>
                  <div
                    className="px-3 py-1 rounded-full font-bold text-xs border border-foreground/10 bg-muted text-foreground"
                  >
                    Sequence Position #{activePreviewIndex + 1} of {pagesList.length}
                  </div>
                </div>

                <div
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-foreground/10 bg-muted relative min-h-[440px]"
                >
                  <div className="w-full flex flex-col items-center">
                    <div
                      style={{
                        transform: `rotate(${activePage ? activePage.rotation : 0}deg)`
                      }}
                      className="w-full max-w-sm h-[360px] rounded-2xl shadow-xl border border-foreground/10 bg-[var(--background-secondary)] overflow-auto relative flex flex-col items-center transition-transform duration-300 pointer-events-auto p-2"
                    >
                      {activePreviewUrl ? (
                        <div className="w-full h-full flex flex-col items-center">
                          <object
                            data={activePreviewUrl}
                            type="application/pdf"
                            className="w-full h-full pointer-events-auto"
                          >
                            <iframe
                              src={activePreviewUrl}
                              className="w-full h-full pointer-events-auto"
                              title="PDF Scrollable Preview"
                            />
                          </object>
                        </div>
                      ) : (
                        <Loader2 className="animate-spin text-foreground m-auto" size={28} />
                      )}

                      <div
                        className="absolute top-3 right-3 border border-foreground/10 bg-[var(--background-secondary)] text-foreground text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 pointer-events-none shadow-sm z-10"
                      >
                        <Maximize2 size={12} /> Scrollable View
                      </div>
                    </div>

                    {activePage && (
                      <div className="mt-4 text-center space-y-1">
                        <p className="text-sm font-bold max-w-xs text-foreground">
                          <span className="hidden sm:inline">Source File: </span>
                          <span className="inline-block text-foreground/70 break-all max-w-[220px] sm:max-w-none sm:truncate">
                            {activePage.fileName}
                          </span>
                        </p>
                        <p className="text-xs text-foreground/60">
                          Original Document Page: <strong className="text-foreground">{activePage.localPageIndex + 1}</strong>
                          {activePage.rotation !== 0 && <span className="ml-2 text-foreground font-semibold">({activePage.rotation}° Rotated)</span>}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                    <button
                      type="button"
                      disabled={activePreviewIndex === 0}
                      onClick={() => setActivePreviewIndex((prev) => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-full border border-foreground/15 shadow-lg flex items-center justify-center bg-[var(--background-secondary)] text-foreground disabled:opacity-20 pointer-events-auto hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
                      title="Previous Page"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      disabled={activePreviewIndex === pagesList.length - 1}
                      onClick={() => setActivePreviewIndex((prev) => Math.min(pagesList.length - 1, prev + 1))}
                      className="w-10 h-10 rounded-full border border-foreground/15 shadow-lg flex items-center justify-center bg-[var(--background-secondary)] text-foreground disabled:opacity-20 pointer-events-auto hover:bg-primary hover:text-primary-foreground transition-all active:scale-95"
                      title="Next Page"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>

                {activePage && (
                  <div
                    className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4 p-4 rounded-2xl border border-foreground/10 bg-muted shadow-inner text-foreground"
                  >
                    <div className="text-xs font-medium text-foreground">
                      Rotate view or remove page:
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => rotatePage(activePreviewIndex, "ccw")}
                        className="py-2.5 px-3 rounded-xl border border-foreground/10 bg-[var(--background-secondary)] text-foreground text-xs font-bold flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                        title="Rotate -90°"
                      >
                        <RotateCcw size={14} /> -90°
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(activePreviewIndex, "cw")}
                        className="py-2.5 px-3 rounded-xl border border-foreground/10 bg-[var(--background-secondary)] text-foreground text-xs font-bold flex items-center gap-1 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                        title="Rotate +90°"
                      >
                        <RotateCw size={14} /> +90°
                      </button>
                      <button
                        type="button"
                        onClick={() => removePage(activePage.id)}
                        className="p-2.5 rounded-xl border border-foreground/10 bg-[var(--background-secondary)] text-foreground hover:bg-primary hover:text-primary-foreground transition-colors ml-1"
                        title="Remove Page"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div
              className="p-5 rounded-2xl border border-foreground/15 bg-[var(--background-secondary)] text-foreground grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 shadow-sm transition-colors"
            >
              <div className="flex sm:flex-col items-center justify-between gap-2 sm:text-center">
                <p className="text-foreground/60 text-xs font-semibold">Total Final Pages</p>
                <p className="text-base font-extrabold sm:mt-1 text-foreground">{pagesList.length} {pagesList.length === 1 ? "Page" : "Pages"}</p>
              </div>
              <div className="flex sm:flex-col items-center justify-between gap-2 sm:text-center">
                <p className="text-foreground/60 text-xs font-semibold">Original Combined Size</p>
                <p className="text-base font-extrabold sm:mt-1 text-foreground">{formatSize(totalOriginalSize)}</p>
              </div>
              <div className="flex sm:flex-col items-center justify-between gap-2 sm:text-center">
                <p className="text-foreground/60 text-xs font-semibold">Estimated Output Size</p>
                <p className="text-foreground text-base font-extrabold sm:mt-1">{estimatedFinalSize}</p>
              </div>
            </div>

            {errorMessage && (
              <div
                className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-semibold text-center transition-all animate-shake"
              >
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="flex flex-col sm:flex-row-reverse items-stretch gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={executeMerge}
                disabled={processing}
                className="flex-1 py-3 px-5 rounded-xl border border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] font-bold text-sm shadow-lg disabled:opacity-40 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {processing ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {processing ? "Merging PDFs..." : `Merge & Download (${pagesList.length} ${pagesList.length === 1 ? "Page" : "Pages"})`}
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="py-3 px-5 sm:px-6 rounded-xl border border-foreground/15 bg-[var(--background-secondary)] text-foreground hover:bg-primary hover:text-primary-foreground font-semibold text-sm transition-colors shadow-sm"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      <SecureNote />
    </div>
  );
}