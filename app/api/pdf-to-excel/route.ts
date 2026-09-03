import { NextRequest, NextResponse } from "next/server";
import { readFormData } from "@/lib/api";
import { metered } from "@/lib/metered";
import { extractPageCells } from "@/lib/pdf-text";
import { rejectBadUpload } from "@/lib/uploads";

export const POST = metered(async (req: NextRequest) => {
  try {
    // Every tool counts against the user's daily allowance (2/20/50 by
    // plan, from Remote Config) and therefore requires sign-in.

    const formData = await readFormData(req);
    if (!formData) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No PDF file uploaded." },
        { status: 400 }
      );
    }

    // Size and type are checked here, before anything reads the bytes.
    const badUpload = rejectBadUpload(file, "pdf");
    if (badUpload) return badUpload;

    const buffer = Buffer.from(await file.arrayBuffer());

    // pdf2json fails on every PDF in this install with "Invalid XRef stream
    // header", so this returned an error for all input. The shared pdf.js
    // extractor keeps each run separate, which is what the column logic below
    // needs.
    const pageCells = await extractPageCells(new Uint8Array(buffer));

    const tableRows: string[][] = (() => {
          const rowsMap: { [y: number]: { x: number; text: string }[] } = {};

          // One flat row list across pages, matching the previous behaviour.
          let rowKey = 0;
          for (const page of pageCells) {
            for (const row of page) {
              const cells = row.filter(
                (c) => c.text && !c.text.startsWith("Sheet:")
              );
              if (cells.length > 0) rowsMap[rowKey++] = cells;
            }
          }

          const sortedYKeys = Object.keys(rowsMap)
            .map(Number)
            .sort((a, b) => a - b);

          const finalRows: string[][] = [];
          let headerProcessed = false;
          let expectedColumnCount = 17; // Based on X1 through y headers

          for (const yKey of sortedYKeys) {
            const rowItems = rowsMap[yKey];

            // Sort column elements left to right based on X coordinates
            rowItems.sort((a, b) => a.x - b.x);

            // Deduplicate items closely stacked at the exact same horizontal position
            const uniqueRowItems: { x: number; text: string }[] = [];
            for (const item of rowItems) {
              const last = uniqueRowItems[uniqueRowItems.length - 1];
              if (!last || Math.abs(last.x - item.x) > 0.6 || last.text !== item.text) {
                uniqueRowItems.push(item);
              }
            }

            let rowTexts = uniqueRowItems.map((item) => item.text);

            if (rowTexts.length > 0) {
              const isHeader = rowTexts.includes("X1") && rowTexts.includes("y");

              if (isHeader) {
                if (!headerProcessed) {
                  headerProcessed = true;
                  expectedColumnCount = rowTexts.length;
                  finalRows.push(rowTexts);
                }
                continue;
              }

              // Trim or pad data rows to match header column width for perfect alignment
              if (rowTexts.length > expectedColumnCount) {
                rowTexts = rowTexts.slice(0, expectedColumnCount);
              }

              finalRows.push(rowTexts);
            }
          }

          return finalRows.length > 0 ? finalRows : [["No structured rows found"]];
    })();

    return NextResponse.json({
      text: tableRows.map((r) => r.join(" ")).join("\n"),
      rows: tableRows,
    });
  } catch (err) {
    console.error("PDF Parsing Error:", err);
    return NextResponse.json(
      { error: "Unable to parse PDF document." },
      { status: 500 }
    );
  }
});