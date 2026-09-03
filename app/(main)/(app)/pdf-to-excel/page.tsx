"use client";

import React, { useState, useRef, JSX } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import { FileText, Trash2, Download, Sparkles, FileSpreadsheet } from "lucide-react";
import { loadXlsx } from "@/lib/pdf-libs";
import { errorMessage } from "@/lib/errors";
import { useCancellableRun, wasCancelled } from "@/hooks/useCancellableRun";

/** A cell as xlsx hands it back from sheet_to_json with header:1. */
type CellValue = string | number | boolean | null;

export default function PdfToExcel(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const { begin, cancel } = useCancellableRun();
  const [extractedRows, setExtractedRows] = useState<CellValue[][] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    setExtractedRows(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile);

      const response = await fetch("/api/pdf-to-excel", {
        method: "POST",
        body: formData, signal });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to process PDF.");

      setExtractedRows(data.rows || [["No tabular text lines found"]]);
    } catch (err) {
      if (wasCancelled(err, signal)) return;
      setError(errorMessage(err, "An error occurred while parsing the PDF."));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = (): void => {
    // Removing the file stops whatever it was being used for.
    cancel();
    setFile(null);
    setExtractedRows(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadExcel = async (): Promise<void> => {
    if (!extractedRows || extractedRows.length === 0) return;

    const XLSX = await loadXlsx();

    const worksheet = XLSX.utils.aoa_to_sheet(extractedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");

    const safeName = file ? file.name.replace(/\.[^/.]+$/, "") : "pdf-data";
    const outputName = `${safeName}-extracted.xlsx`;
    XLSX.writeFile(workbook, outputName);
  };

  return (
    <div className="w-full text-fg antialiased selection:bg-slate-900 dark:selection:bg-blue-500 selection:text-white px-4 sm:px-6 py-6 sm:py-10">
      <div className="w-full max-w-4xl mx-auto space-y-5 md:space-y-8">

        <div className="text-center space-y-1.5 md:space-y-2">
          <div className="flex justify-center mb-1 md:mb-0">
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-card border border-card shadow-sm md:w-auto md:h-auto md:inline-flex md:px-3 md:py-1 md:rounded-full md:gap-1.5 md:shadow-none md:bg-slate-100 dark:md:bg-blue-500/10 md:border-slate-200 dark:md:border-blue-500/20">
              <Sparkles className="w-5 h-5 md:w-3.5 md:h-3.5 text-fg md:text-slate-700 dark:md:text-blue-400" />
              <span className="hidden md:inline text-slate-700 dark:text-blue-400 text-xs font-semibold tracking-wide uppercase">
                Document Conversion Suite
              </span>
            </div>
          </div>
          <h1 className="text-xl leading-tight md:text-3xl font-bold tracking-tight text-fg">
            PDF to Excel Converter
          </h1>
          <p className="text-[13px] leading-[18px] md:text-sm md:leading-normal text-muted max-w-[300px] md:max-w-xl mx-auto">
            Extract text rows and tables from your PDF documents and export them directly into structured spreadsheets (.xlsx).
          </p>
        </div>

        {!file && (
          <div className="w-full md:w-auto">
            <UploadCard
              onFiles={handleFileUpload}
              title="Click to upload PDF document"
              hint="Supports text-based PDF documents"
            />
          </div>
        )}

        {file && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[var(--background-secondary)] border border-card p-3 md:p-4 rounded-2xl">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-blue-500/10 border border-slate-200 dark:border-blue-500/20 flex items-center justify-center text-slate-700 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-fg truncate max-w-[220px]">{file.name}</h3>
                  <span className="text-[11px] text-muted">Ready for spreadsheet export</span>
                </div>
              </div>
              <button
                onClick={handleClear}
                className="inline-flex items-center justify-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 px-3 py-2 md:py-1.5 rounded-xl border border-rose-200 dark:border-rose-500/20 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove File</span>
              </button>
            </div>

            {loading && (
              <div className="text-center py-12 text-muted text-xs animate-pulse">
                Parsing text rows and structuring data from PDF...
              </div>
            )}

            {extractedRows && !loading && (
              <div className="bg-[var(--background-secondary)] border border-card rounded-2xl p-3 md:p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-muted" /> Extracted Rows Preview ({extractedRows.length} rows)
                  </span>
                </div>
                <div className="max-h-[260px] overflow-auto rounded-xl border border-card bg-white dark:bg-black/30">
                  <table className="w-full min-w-max text-left text-xs text-muted border-collapse">
                    <tbody>
                      {extractedRows.slice(0, 10).map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-2.5 truncate max-w-[150px]">
                              {cell !== null && cell !== undefined ? String(cell) : ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {extractedRows && !loading && (
          <button
            onClick={handleDownloadExcel}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-slate-900/10 border border-[var(--primary)] cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Download Extracted Excel (.xlsx)</span>
          </button>
        )}

        <SecureNote />

      </div>
    </div>
  );
}