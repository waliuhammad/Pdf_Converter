"use client";
/* eslint-disable @next/next/no-img-element -- Every image on this page is a
   preview of a file the visitor just picked, shown from an object URL.
   next/image cannot optimise that (there is no server-side image to resize);
   it would need unoptimized, which renders this same tag inside a wrapper. */

import { useEffect, useRef, useState } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import {
  ArrowLeft,
  ArrowRight,
  FileImage,
  Loader2,
  Plus,
  Sparkles,
  Download,
  X,
} from "lucide-react";
import { loadJsZip, loadPdfLib } from "@/lib/pdf-libs";
import { errorMessage } from "@/lib/errors";
import { claimOperation, releaseOperation } from "@/lib/claim-operation";
import { downloadBlob } from "@/lib/download";
import {
  MARGINS,
  addImagePage,
  layoutFor,
  type LayoutOptions,
  type MarginSize,
  type Orientation,
  type PageSize,
  type PdfImageInput,
} from "@/lib/images-to-pdf";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
}

const newId = () => Math.random().toString(36).substring(2, 9);

const baseName = (name: string) => name.replace(/\.[^/.]+$/, "") || "image";

/**
 * The EXIF orientation of a JPEG (1 = upright), or 1 when there is none.
 *
 * Phones store photos sideways and record the turn in EXIF. Browsers honour
 * it when showing the picture, but a PDF embeds the raw pixels, so without
 * this a portrait photo arrived lying on its side.
 */
function jpegOrientation(bytes: Uint8Array): number {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset] !== 0xff) return 1;
    const marker = bytes[offset + 1];
    const length = view.getUint16(offset + 2);
    if (marker === 0xe1 && view.getUint32(offset + 4) === 0x45786966) {
      const tiff = offset + 10;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      const entries = view.getUint16(ifd, little);
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 10 > bytes.length) return 1;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 1;
    }
    if (marker === 0xda) return 1; // image data starts; no EXIF before it
    offset += 2 + length;
  }
  return 1;
}

function sniffKind(bytes: Uint8Array): "jpg" | "png" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  return null;
}

/**
 * Redraw an image through a canvas: for formats pdf-lib cannot embed (WebP,
 * GIF, BMP, SVG, AVIF...) and for JPEGs that need their EXIF turn applied,
 * which the browser does when it draws them.
 */
function rasterise(previewUrl: string, name: string, asJpeg: boolean): Promise<PdfImageInput> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || 1000;
      canvas.height = img.naturalHeight || 1000;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error(`Could not render "${name}".`));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(new Error(`Could not render "${name}".`));
            return;
          }
          resolve({ bytes: new Uint8Array(await blob.arrayBuffer()), kind: asJpeg ? "jpg" : "png" });
        },
        asJpeg ? "image/jpeg" : "image/png",
        0.92
      );
    };
    img.onerror = () => reject(new Error(`Could not render "${name}".`));
    img.src = previewUrl;
  });
}

async function toPdfImage(item: ImageItem): Promise<PdfImageInput> {
  const bytes = new Uint8Array(await item.file.arrayBuffer());
  const kind = sniffKind(bytes);
  if (kind === "png") return { bytes, kind };
  if (kind === "jpg") {
    return jpegOrientation(bytes) > 1 ? rasterise(item.previewUrl, item.file.name, true) : { bytes, kind };
  }
  return rasterise(item.previewUrl, item.file.name, false);
}

/** Zip entry names must be unique; a second "scan.pdf" becomes "scan (2).pdf". */
function uniqueName(name: string, used: Set<string>): string {
  let candidate = name;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = name.replace(/(\.[^.]+)?$/, ` (${n++})$1`);
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function chipClass(active: boolean): string {
  return `py-2.5 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
    active
      ? "border-primary bg-primary text-primary-foreground shadow-sm"
      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  }`;
}

export default function ImageToPdf() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [margin, setMargin] = useState<MarginSize>("none");
  const [merge, setMerge] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<ImageItem[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  // Release the previews when the page goes away.
  useEffect(() => () => imagesRef.current.forEach((img) => URL.revokeObjectURL(img.previewUrl)), []);

  const options: LayoutOptions = { pageSize, orientation, margin };

  const loadFiles = async (newFiles: File[]) => {
    const loaded: ImageItem[] = [];
    const rejected: string[] = [];

    for (const file of newFiles) {
      if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|bmp|gif|svg|avif)$/i.test(file.name)) {
        rejected.push(file.name);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number } | null>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve({ w: img.naturalWidth || img.width, h: img.naturalHeight || img.height });
        img.onerror = () => resolve(null);
        img.src = previewUrl;
      });

      // A file the browser cannot decode would only break the PDF later.
      if (!dims || !dims.w || !dims.h) {
        URL.revokeObjectURL(previewUrl);
        rejected.push(file.name);
        continue;
      }

      loaded.push({ id: newId(), file, previewUrl, width: dims.w, height: dims.h });
    }

    setError(
      rejected.length > 0
        ? `Could not read ${rejected.length === 1 ? "this file" : "these files"}: ${rejected.join(", ")}.`
        : null
    );
    setDone(null);
    if (loaded.length > 0) setImages((prev) => [...prev, ...loaded]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  const moveImage = (index: number, delta: number) => {
    setImages((prev) => {
      const to = index + delta;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setError(null);
    setDone(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError("Please add at least one image.");
      return;
    }

    // Converting happens in the browser, so no route meters this tool. Claim
    // the operation first, and stop if the plan says no.
    const claim = await claimOperation();
    if (!claim.ok) {
      setError(claim.message);
      return;
    }

    setLoading(true);
    setError(null);
    setDone(null);

    try {
      const lib = await loadPdfLib();
      const first = baseName(images[0].file.name);

      if (merge || images.length === 1) {
        const doc = await lib.PDFDocument.create();
        for (const item of images) await addImagePage(doc, await toPdfImage(item), options);
        const bytes = await doc.save();
        downloadBlob(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }), `${first}.pdf`);
        setDone(images.length === 1 ? "Your PDF has been downloaded." : `All ${images.length} images were merged into one PDF.`);
      } else {
        const JSZip = await loadJsZip();
        const zip = new JSZip();
        const used = new Set<string>();
        for (const item of images) {
          const doc = await lib.PDFDocument.create();
          await addImagePage(doc, await toPdfImage(item), options);
          zip.file(uniqueName(`${baseName(item.file.name)}.pdf`, used), await doc.save());
        }
        const blob = await zip.generateAsync({ type: "blob" });
        downloadBlob(blob, `${first}_pdf.zip`);
        setDone(`${images.length} PDFs were downloaded in a ZIP file.`);
      }
    } catch (err) {
      // The operation was claimed before the work started, so give it back.
      void releaseOperation();
      setError(errorMessage(err, "Failed to convert images to PDF."));
    } finally {
      setLoading(false);
    }
  };

  /** A thumbnail of the page each image will become, drawn to the real proportions. */
  const pagePreview = (item: ImageItem) => {
    const box = layoutFor(item.width, item.height, options);
    const pct = (v: number, of: number) => `${(v / of) * 100}%`;
    return (
      <div
        className="relative w-full bg-white shadow-sm border border-border rounded-sm overflow-hidden"
        style={{ aspectRatio: `${box.pageWidth} / ${box.pageHeight}` }}
      >
        <img
          src={item.previewUrl}
          alt={item.file.name}
          className="absolute"
          style={{
            left: pct(box.x, box.pageWidth),
            // PDF y runs up from the bottom; CSS top runs down.
            top: pct(box.pageHeight - box.y - box.height, box.pageHeight),
            width: pct(box.width, box.pageWidth),
            height: pct(box.height, box.pageHeight),
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full text-foreground antialiased px-4 sm:px-6 py-6 sm:py-10">
      <div className="w-full max-w-5xl mx-auto space-y-5 md:space-y-8">
        <div className="text-center space-y-1.5 md:space-y-2">
          <div className="flex justify-center mb-1 md:mb-0">
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-card border border-border shadow-sm md:w-auto md:h-auto md:inline-flex md:px-3 md:py-1 md:rounded-full md:gap-1.5 md:shadow-none md:bg-primary/10 md:border-primary/20">
              <Sparkles className="w-5 h-5 md:w-3.5 md:h-3.5 text-foreground md:text-primary" />
              <span className="hidden md:inline text-primary text-xs font-semibold tracking-wide uppercase">
                Images to PDF
              </span>
            </div>
          </div>
          <h1 className="text-xl leading-tight md:text-3xl font-bold tracking-tight text-foreground">
            JPG to PDF
          </h1>
          <p className="text-[13px] leading-[18px] md:text-sm md:leading-normal text-muted-foreground max-w-[300px] md:max-w-xl mx-auto">
            Turn JPG, PNG and other images into PDF. Choose the page size, orientation and margin, and merge
            them into one file or keep one PDF per image.
          </p>
        </div>

        {images.length === 0 ? (
          <UploadCard
            onFiles={(files) => loadFiles(Array.from(files ?? []))}
            accept="image/*"
            multiple
            title="Click to upload images"
            hint="Supports JPG, PNG, WebP, GIF, BMP"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Pages */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-3 md:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider">
                  {images.length} {images.length === 1 ? "image" : "images"}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => addMoreInputRef.current?.click()}
                    className="inline-flex items-center gap-1 text-xs text-primary-foreground bg-primary hover:opacity-90 px-3 py-1.5 rounded-lg transition font-medium shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add images
                  </button>
                  <input
                    ref={addMoreInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = "";
                      void loadFiles(files);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
                {images.map((item, idx) => (
                  <div key={item.id} className="group rounded-xl bg-muted border border-border p-2 space-y-1.5">
                    <div className="relative">
                      {pagePreview(item)}
                      <button
                        type="button"
                        onClick={() => removeImage(item.id)}
                        title="Remove"
                        aria-label={`Remove ${item.file.name}`}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 border border-border text-muted-foreground hover:text-red-600 flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move earlier"
                        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate text-center" title={item.file.name}>
                        {idx + 1}. {item.file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, 1)}
                        disabled={idx === images.length - 1}
                        aria-label="Move later"
                        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Page orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["portrait", "landscape"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        disabled={pageSize === "fit"}
                        onClick={() => setOrientation(o)}
                        className={`${chipClass(orientation === o && pageSize !== "fit")} capitalize disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                  {pageSize === "fit" && (
                    <p className="text-[11px] text-muted-foreground">Each page takes the shape of its image.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Page size
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "fit", label: "Fit image" },
                        { id: "a4", label: "A4" },
                        { id: "letter", label: "US Letter" },
                      ] as const
                    ).map((s) => (
                      <button key={s.id} type="button" onClick={() => setPageSize(s.id)} className={chipClass(pageSize === s.id)}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Margin
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: "none", label: "No margin" },
                        { id: "small", label: "Small" },
                        { id: "big", label: "Big" },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMargin(m.id)}
                        className={chipClass(margin === m.id)}
                        title={m.id === "none" ? undefined : `${MARGINS[m.id]} pt`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {images.length > 1 && (
                  <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={merge}
                      onChange={(e) => setMerge(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded cursor-pointer"
                    />
                    Merge all images in one PDF file
                  </label>
                )}
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}
              {done && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                  {done}
                </div>
              )}

              <button
                type="button"
                onClick={handleConvert}
                disabled={loading}
                className="w-full px-6 py-3.5 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-semibold text-sm shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Converting...
                  </>
                ) : (
                  <>
                    {merge || images.length === 1 ? <FileImage className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    Convert to PDF
                  </>
                )}
              </button>
              {images.length > 1 && (
                <p className="text-center text-[11px] text-muted-foreground">
                  {merge ? "One PDF, one page per image." : `${images.length} separate PDFs in a ZIP file.`}
                </p>
              )}
            </div>
          </div>
        )}

        <SecureNote />
      </div>
    </div>
  );
}

