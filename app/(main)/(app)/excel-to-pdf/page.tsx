"use client";

import React, { useState, useRef, JSX } from "react";
import { SecureNote, UploadCard } from "@/components/tools/upload-card";
import {
  FileSpreadsheet,
  Trash2,
  Download,
  Sparkles,
  Layers,
  Sliders,
} from "lucide-react";
import { loadJsPdfWithAutoTable, loadXlsx } from "@/lib/pdf-libs";
import { errorMessage } from "@/lib/errors";
import { claimOperation, releaseOperation } from "@/lib/claim-operation";

/** A cell as xlsx hands it back from sheet_to_json with header:1. */
type CellValue = string | number | boolean | null;

interface SheetData {
  name: string;
  data: CellValue[][];
}

export default function ExcelToPdf(): JSX.Element {
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [startRow, setStartRow] = useState<number>(1);
  const [maxRows, setMaxRows] = useState<number>(60);
  const [startCol, setStartCol] = useState<number>(1);
  const [maxCols, setMaxCols] = useState<number>(70);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (fileList: FileList | null): void => {
    const file = fileList?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError("Please upload a valid Excel or CSV file (.xlsx, .xls, .csv)");
      return;
    }

    setFileName(file.name);
    setError(null);
    setLoading(true);

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(
          event.target?.result as ArrayBuffer
        );

        const XLSX = await loadXlsx();
        const workbook = XLSX.read(data, { type: "array" });

        const parsedSheets: SheetData[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];

          const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as CellValue[][];

          return {
            name,
            data: jsonRows.length > 0 ? jsonRows : [["Empty Sheet"]],
          };
        });

        setSheets(parsedSheets);
        setSelectedSheetIndex(0);
      } catch (err) {
        setError(errorMessage(err, "Failed to parse spreadsheet file."));
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleClear = (): void => {
    setSheets([]);
    setSelectedSheetIndex(0);
    setFileName("");
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getSlicedData = (fullData: CellValue[][]) => {
    const sRow = Math.max(0, startRow - 1);
    const eRow = sRow + maxRows;
    const sCol = Math.max(0, startCol - 1);
    const eCol = sCol + maxCols;

    const slicedRows = fullData.slice(sRow, eRow);

    return slicedRows.map((row) => row.slice(sCol, eCol));
  };

  const handleConvertToPdf = async (): Promise<void> => {
    if (sheets.length === 0) {
      setError("Please upload a spreadsheet first.");
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

    try {
      const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      sheets.forEach((sheet, index) => {
        if (index > 0) {
          doc.addPage();
        }

        doc.setFontSize(14);

        doc.text(
          `Sheet: ${sheet.name} (Rows ${startRow}-${startRow + maxRows - 1}, Cols ${startCol}-${startCol + maxCols - 1})`,
          14,
          15
        );

        const sliced = getSlicedData(sheet.data);
        const headers = sliced[0] || [];
        const rows = sliced.slice(1);

        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 20,
          theme: "grid",
          styles: {
            fontSize: 7,
            cellPadding: 2,
          },
          headStyles: {
            fillColor: [51, 65, 85],
          },
          margin: {
            left: 14,
            right: 14,
          },
        });
      });

      const outputName = fileName
        ? `${fileName.replace(/\.[^/.]+$/, "")}-custom-range.pdf`
        : "spreadsheet-export.pdf";

      doc.save(outputName);
    } catch (err) {
      // The operation was claimed before the work started, so give it back.
      void releaseOperation();
      setError(errorMessage(err, "Failed to generate PDF."));
    } finally {
      setLoading(false);
    }
  };

  const currentSheet = sheets[selectedSheetIndex];

  const previewSlicedData = currentSheet
    ? getSlicedData(currentSheet.data)
    : [];

  return (
    <div className="w-full text-fg antialiased selection:bg-primary selection:text-primary-foreground px-4 sm:px-6 py-6 sm:py-10">

      <div className="w-full max-w-4xl mx-auto space-y-5 md:space-y-8">

        {/* Tool Header */}
        <div className="text-center space-y-1.5 md:space-y-2">

          <div className="flex justify-center mb-1 md:mb-0">
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl bg-card border border-card shadow-sm md:w-auto md:h-auto md:inline-flex md:px-3 md:py-1 md:rounded-full md:gap-1.5 md:shadow-none">
              <Sparkles className="w-5 h-5 md:w-3.5 md:h-3.5 text-fg" />

              <span className="hidden md:inline text-muted text-xs font-semibold tracking-wide uppercase">
                Document Conversion Suite
              </span>
            </div>
          </div>

          <h1 className="text-xl leading-tight md:text-3xl font-bold tracking-tight text-fg">
            Excel to PDF Converter
          </h1>

          <p className="text-[13px] leading-[18px] md:text-sm md:leading-normal text-muted max-w-[300px] md:max-w-xl mx-auto">
            Restrict and clip exact rows and columns from your spreadsheets for clean target PDF output.
          </p>
        </div>

        {/* Upload */}
        {sheets.length === 0 && (
          <div className="w-full md:w-auto">
            <UploadCard
              onFiles={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              title="Click to upload spreadsheet file"
              hint="Supports .xlsx, .xls, and .csv formats"
            />
          </div>
        )}

        {/* Uploaded File Content */}
        {sheets.length > 0 && (
          <div className="space-y-4 md:space-y-6">

            {/* File Information */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-[var(--background-secondary)] border border-card p-3 md:p-4 rounded-2xl">

              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>

                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-fg truncate max-w-[220px]">
                    {fileName}
                  </h3>

                  <span className="text-[11px] text-muted">
                    {sheets.length} worksheet(s) found
                  </span>
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

            {/* Worksheets */}
            {sheets.length > 1 && (
              <div className="space-y-2">

                <span className="text-[11px] text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
                  Select Active Worksheet Preview
                </span>

                <div className="flex gap-2 overflow-x-auto pb-2">
                  {sheets.map((s, idx) => (
                    <button
                      key={s.name}
                      onClick={() => setSelectedSheetIndex(idx)}
                      className={`py-2 px-4 rounded-xl text-xs font-semibold tracking-wide transition shrink-0 cursor-pointer border ${
                        selectedSheetIndex === idx
                          ? "bg-primary border-primary text-primary-foreground shadow-sm"
                          : "bg-muted border-border text-muted-foreground hover:bg-[var(--background-secondary)]"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Row / Column Restrictions */}
            <div className="bg-[var(--background-secondary)] border border-card rounded-2xl p-4 md:p-5 space-y-4">

              <div className="flex items-center space-x-2 text-fg text-sm font-semibold border-b border-card pb-2">
                <Sliders className="w-4 h-4 text-muted shrink-0" />
                <span>Row & Column Range Restrictions</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                <div>
                  <label className="text-[11px] text-muted font-bold uppercase">
                    Start Row
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={startRow}
                    onChange={(e) =>
                      setStartRow(
                        Math.max(
                          1,
                          parseInt(e.target.value) || 1
                        )
                      )
                    }
                    className="w-full bg-card border border-card rounded-xl px-3 py-2 text-xs text-fg mt-1 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted font-bold uppercase">
                    Max Rows (e.g. 60)
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={maxRows}
                    onChange={(e) =>
                      setMaxRows(
                        Math.max(
                          1,
                          parseInt(e.target.value) || 1
                        )
                      )
                    }
                    className="w-full bg-card border border-card rounded-xl px-3 py-2 text-xs text-fg mt-1 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted font-bold uppercase">
                    Start Column
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={startCol}
                    onChange={(e) =>
                      setStartCol(
                        Math.max(
                          1,
                          parseInt(e.target.value) || 1
                        )
                      )
                    }
                    className="w-full bg-card border border-card rounded-xl px-3 py-2 text-xs text-fg mt-1 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-muted font-bold uppercase">
                    Max Cols (e.g. 70)
                  </label>

                  <input
                    type="number"
                    min={1}
                    value={maxCols}
                    onChange={(e) =>
                      setMaxCols(
                        Math.max(
                          1,
                          parseInt(e.target.value) || 1
                        )
                      )
                    }
                    className="w-full bg-card border border-card rounded-xl px-3 py-2 text-xs text-fg mt-1 focus:outline-none focus:border-primary"
                  />
                </div>

              </div>
            </div>

            {/* Preview */}
            {currentSheet && (
              <div className="bg-[var(--background-secondary)] border border-card rounded-2xl p-3 md:p-4 space-y-3">

                <span className="text-[11px] text-muted font-bold uppercase tracking-wider block">
                  Clipped Range Preview ({previewSlicedData.length} rows x{" "}
                  {previewSlicedData[0]?.length || 0} cols)
                </span>

                <div className="max-h-[240px] overflow-auto rounded-xl border border-card bg-background">

                  <table className="w-full min-w-max text-left text-xs text-muted border-collapse">

                    <tbody>
                      {previewSlicedData
                        .slice(0, 10)
                        .map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="border-b border-card hover:bg-muted"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="p-2.5 truncate max-w-[120px]"
                              >
                                {cell !== null &&
                                cell !== undefined
                                  ? String(cell)
                                  : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>

                  </table>
                </div>

                {previewSlicedData.length > 10 && (
                  <span className="text-[11px] text-muted-foreground text-center block">
                    Showing first 10 preview rows of your selected range...
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Convert Button */}
        {sheets.length > 0 && (
          <button
            onClick={handleConvertToPdf}
            disabled={loading}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] active:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg cursor-pointer border border-[var(--primary)]"
          >
            <Download className="w-5 h-5 shrink-0" />

            <span className="text-center">
              {loading
                ? "Generating PDF..."
                : "Convert Restricted Range to PDF"}
            </span>
          </button>
        )}

        {/* Security Notice */}
        <SecureNote />

      </div>
    </div>
  );
}