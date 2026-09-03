/**
 * Lazy loaders for the PDF libraries the tool pages use in the browser.
 *
 * Imported normally these sit in a page's first load — pdfjs-dist, xlsx and
 * pdf-lib are 300-400 KB each — and download before the user has even chosen a
 * file. Called from inside a handler instead, they arrive only when the work
 * actually starts.
 *
 * Each promise is cached, so a page that converts twice fetches once.
 */

let pdfjs: Promise<typeof import("pdfjs-dist")> | null = null;
let jspdf: Promise<typeof import("jspdf")> | null = null;
let xlsx: Promise<typeof import("xlsx")> | null = null;
let pdflib: Promise<typeof import("pdf-lib")> | null = null;
// jszip is published as `export = JSZip`, so the module object is the constructor.
let jszip: Promise<typeof import("jszip")> | null = null;

export function loadPdfjs() {
  if (!pdfjs) {
    pdfjs = import("pdfjs-dist").then((lib) => {
      // The worker has to be pointed at a build matching the library version.
      lib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${lib.version}/pdf.worker.min.js`;
      return lib;
    });
  }
  return pdfjs;
}

export function loadJsPdf() {
  if (!jspdf) jspdf = import("jspdf");
  return jspdf;
}

/** jsPDF plus the autoTable plugin, which needs jsPDF alongside it. */
export function loadJsPdfWithAutoTable() {
  return Promise.all([loadJsPdf(), import("jspdf-autotable")]).then(
    ([{ jsPDF }, { default: autoTable }]) => ({ jsPDF, autoTable })
  );
}

export function loadXlsx() {
  if (!xlsx) xlsx = import("xlsx");
  return xlsx;
}

export function loadPdfLib() {
  if (!pdflib) pdflib = import("pdf-lib");
  return pdflib;
}

export function loadJsZip() {
  if (!jszip) jszip = import("jszip").then((m) => m.default ?? m);
  return jszip;
}
