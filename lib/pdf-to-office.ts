import "server-only";
import fs from "fs";
import os from "os";
import path from "path";
import JSZip from "jszip";
import pptxgen from "pptxgenjs";
import { pdfToPng } from "pdf-to-png-converter";
import { withOwnPdfWorker } from "@/lib/pdf-worker-isolation";
import type { TextLine } from "@/lib/pdf-layout";

/**
 * PDF -> Word / PowerPoint / Excel that look exactly like the PDF.
 *
 * These tools used to pull the text out of the PDF and lay it down again as
 * plain paragraphs, slides of bullet points or rows of cells. A certificate,
 * a brochure or a designed report came back as a page of loose text: the
 * borders, logos, fonts, colours and layout were all gone.
 *
 * Now every page's artwork is rendered to an image at print-friendly
 * resolution and placed full-size in the output — one page per Word section,
 * one slide per page, one worksheet per page. For Word and PowerPoint the
 * artwork is rendered without its text, and each line of text is laid on top
 * as a real text box in the same place, font, size, weight and colour (see
 * lib/pdf-layout.ts), so the document looks the same and can still be edited.
 * The Excel file shows each page whole and adds a "Text" sheet with the text.
 */

/** 2.5 x 72 dpi = 180 dpi: sharp on screen and acceptable in print. */
const SCALE = 2.5;

export interface RenderedPage {
    png: Buffer;
    /** Page size in PDF points (1/72 inch). */
    widthPt: number;
    heightPt: number;
    /** Editable text to lay over the image; absent when the image already shows the text. */
    lines?: TextLine[];
}

export async function renderPdfPages(bytes: Uint8Array): Promise<RenderedPage[]> {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-office-"));
    const input = path.join(dir, "input.pdf");
    try {
        fs.writeFileSync(input, bytes);
        const pages = await withOwnPdfWorker(() =>
            pdfToPng(input, { viewportScale: SCALE })
        );
        return pages
            .filter((p) => p.content)
            .map((p) => ({
                png: p.content as Buffer,
                widthPt: p.width / SCALE,
                heightPt: p.height / SCALE,
            }));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}

const EMU_PER_PT = 12700;
const TWIPS_PER_PT = 20;

function xmlEscape(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        // Control characters other than tab/newline are not allowed in XML 1.0.
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}

// ---------------------------------------------------------------- Word

/**
 * One line of text as a borderless, transparent text box pinned to the page
 * at the line's position. It grows to fit and never wraps, so editing the
 * words keeps them on one line where they were. Wrapped in
 * mc:AlternateContent the way Word itself writes text boxes.
 */
function docxTextBox(line: TextLine, id: number): string {
    const x = Math.round(line.x * EMU_PER_PT);
    const y = Math.round(line.top * EMU_PER_PT);
    // Office fonts are rarely metrically identical to the PDF's, so leave room.
    const cx = Math.round((line.width * 1.15 + line.size) * EMU_PER_PT);
    const cy = Math.round(line.size * 1.3 * EMU_PER_PT);
    const halfPoints = Math.max(2, Math.round(line.size * 2));
    const font = xmlEscape(line.font);
    const rPr = `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${line.bold ? "<w:b/>" : ""}${line.italic ? "<w:i/>" : ""}<w:color w:val="${line.color}"/><w:sz w:val="${halfPoints}"/><w:szCs w:val="${halfPoints}"/></w:rPr>`;
    return `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${id}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${x}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${y}</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="Text ${id}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent><w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r>${rPr}<w:t xml:space="preserve">${xmlEscape(line.text)}</w:t></w:r></w:p></w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"><a:spAutoFit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice><mc:Fallback/></mc:AlternateContent></w:r>`;
}

/**
 * Each page becomes its own section, sized to that page with zero margins, and
 * the image is anchored behind the text at the page's top-left corner. An
 * anchored image (rather than an inline one) is what stops Word adding a blank
 * page after each image when it is exactly as tall as the page.
 */
export async function pagesToDocx(pages: RenderedPage[]): Promise<Uint8Array> {
    const zip = new JSZip();

    const body = pages
        .map((page, i) => {
            const n = i + 1;
            const cx = Math.round(page.widthPt * EMU_PER_PT);
            const cy = Math.round(page.heightPt * EMU_PER_PT);
            const sectPr = `<w:sectPr><w:pgSz w:w="${Math.round(page.widthPt * TWIPS_PER_PT)}" w:h="${Math.round(page.heightPt * TWIPS_PER_PT)}"${page.widthPt > page.heightPt ? ' w:orient="landscape"' : ""}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
            const drawing = `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${n}" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${n}" name="Page ${n}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="page${n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
            const textBoxes = (page.lines ?? []).map((line, j) => docxTextBox(line, n * 1000 + j)).join("");
            const isLast = i === pages.length - 1;
            // A section ends with the paragraph that carries its sectPr; the
            // last section's sectPr sits directly in the body instead.
            return isLast
                ? `<w:p>${drawing}${textBoxes}</w:p>${sectPr}`
                : `<w:p><w:pPr>${sectPr}</w:pPr>${drawing}${textBoxes}</w:p>`;
        })
        .join("");

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`
    );
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
    );
    zip.file(
        "word/_rels/document.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${pages
            .map(
                (_, i) =>
                    `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/page${i + 1}.png"/>`
            )
            .join("")}</Relationships>`
    );
    zip.file(
        "word/document.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><w:body>${body}</w:body></w:document>`
    );
    pages.forEach((page, i) => zip.file(`word/media/page${i + 1}.png`, page.png));

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

// ---------------------------------------------------------------- PowerPoint

/** One slide per page, the slide sized to the first page, each image fitted inside it. */
export async function pagesToPptx(pages: RenderedPage[], title: string): Promise<Uint8Array> {
    const pptx = new pptxgen();
    pptx.title = title;

    const slideW = pages[0].widthPt / 72;
    const slideH = pages[0].heightPt / 72;
    pptx.defineLayout({ name: "PDF", width: slideW, height: slideH });
    pptx.layout = "PDF";

    for (const page of pages) {
        // Pages of a different shape are scaled to fit and centred rather
        // than stretched.
        const scale = Math.min(slideW / (page.widthPt / 72), slideH / (page.heightPt / 72));
        const w = (page.widthPt / 72) * scale;
        const h = (page.heightPt / 72) * scale;
        const offsetX = (slideW - w) / 2;
        const offsetY = (slideH - h) / 2;
        const slide = pptx.addSlide();
        slide.addImage({
            data: `image/png;base64,${page.png.toString("base64")}`,
            x: offsetX,
            y: offsetY,
            w,
            h,
        });

        // Each line as an editable text box at the same place, same style.
        for (const line of page.lines ?? []) {
            slide.addText(line.text, {
                x: offsetX + (line.x / 72) * scale,
                y: offsetY + (line.top / 72) * scale,
                w: ((line.width * 1.15 + line.size) / 72) * scale,
                h: ((line.size * 1.3) / 72) * scale,
                fontFace: line.font,
                fontSize: Math.max(1, line.size * scale),
                bold: line.bold,
                italic: line.italic,
                color: line.color,
                margin: 0,
                valign: "top",
                wrap: false,
                fit: "none",
            });
        }
    }

    const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    return new Uint8Array(out);
}

// ---------------------------------------------------------------- Excel

/** "A", "B", … "Z", "AA" — the column letters for a 0-based index. */
function columnName(index: number): string {
    let name = "";
    for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
        name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
    }
    return name;
}

/**
 * One worksheet per page holding the page image, plus a "Text" sheet with the
 * extracted text laid out row by row (one row per line, one cell per run of
 * text), so the content can still be sorted, searched and copied.
 */
export async function pagesToXlsx(
    pages: RenderedPage[],
    textRows: string[][]
): Promise<Uint8Array> {
    const zip = new JSZip();
    const sheetCount = pages.length + 1;

    const sheetNames = [...pages.map((_, i) => `Page ${i + 1}`), "Text"];

    zip.file(
        "[Content_Types].xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheetNames
            .map(
                (_, i) =>
                    `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
            )
            .join("")}${pages
            .map(
                (_, i) =>
                    `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
            )
            .join("")}</Types>`
    );
    zip.file(
        "_rels/.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    );
    zip.file(
        "xl/workbook.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheetNames
            .map((name, i) => `<sheet name="${name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
            .join("")}</sheets></workbook>`
    );
    zip.file(
        "xl/_rels/workbook.xml.rels",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames
            .map(
                (_, i) =>
                    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
            )
            .join("")}</Relationships>`
    );

    pages.forEach((page, i) => {
        const n = i + 1;
        const cx = Math.round(page.widthPt * EMU_PER_PT);
        const cy = Math.round(page.heightPt * EMU_PER_PT);
        zip.file(
            `xl/worksheets/sheet${n}.xml`,
            // Print setup matching the page — its orientation, no margins, fitted
            // to one sheet of paper — so printing the sheet or converting it back
            // to PDF gives the page whole instead of cut across several.
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews><sheetData/><pageMargins left="0" right="0" top="0" bottom="0" header="0" footer="0"/><pageSetup paperSize="9" orientation="${page.widthPt > page.heightPt ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="1"/><drawing r:id="rId1"/></worksheet>`
        );
        zip.file(
            `xl/worksheets/_rels/sheet${n}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`
        );
        zip.file(
            `xl/drawings/drawing${n}.xml`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${n + 1}" name="Page ${n}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`
        );
        zip.file(
            `xl/drawings/_rels/drawing${n}.xml.rels`,
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/page${n}.png"/></Relationships>`
        );
        zip.file(`xl/media/page${n}.png`, page.png);
    });

    const rows = textRows
        .map((row, r) => {
            const cells = row
                .map(
                    (text, c) =>
                        `<c r="${columnName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`
                )
                .join("");
            return `<row r="${r + 1}">${cells}</row>`;
        })
        .join("");
    zip.file(
        `xl/worksheets/sheet${sheetCount}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`
    );

    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
