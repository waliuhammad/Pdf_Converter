/**
 * What a split will produce, worked out from the options and the page count
 * alone — no PDF library involved.
 *
 * The page uses it to say "4 PDFs will be created" (and to show errors as the
 * visitor types) before anything is uploaded; the route uses the very same
 * function to decide what to build, so the preview cannot disagree with the
 * download.
 */

export interface PageRange {
  from: number;
  to: number;
}

export type SplitOptions =
  /** Each range becomes one PDF. */
  | { mode: "custom"; ranges: PageRange[]; merge: boolean }
  /** Consecutive chunks of `size` pages; the last may be shorter. */
  | { mode: "fixed"; size: number; merge: boolean }
  /** Every page becomes its own PDF. */
  | { mode: "all"; merge: boolean }
  /** The listed pages ("1,5-8,12"), each its own PDF. */
  | { mode: "select"; pages: string; merge: boolean };

export interface SplitGroup {
  /** Shown in names: "1-3" or "5". */
  label: string;
  /** Zero-based page indexes, in output order. */
  pages: number[];
}

export interface SplitPlan {
  /** One entry per file that will be produced. */
  files: SplitGroup[];
  /** True when the result is a single PDF rather than a ZIP. */
  single: boolean;
}

/** A problem with the options, worded for the visitor. */
export class SplitPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SplitPlanError";
  }
}

/** Above this the ZIP would be absurd, and building it would tie the server up. */
export const MAX_SPLIT_FILES = 500;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function checkPage(page: number, total: number, where: string): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new SplitPlanError(`${where}: enter a page number of 1 or more.`);
  }
  if (page > total) {
    throw new SplitPlanError(
      `${where}: page ${page} does not exist — this PDF has ${plural(total, "page")}.`
    );
  }
}

function rangeLabel(from: number, to: number): string {
  return from === to ? String(from) : `${from}-${to}`;
}

function span(from: number, to: number): number[] {
  const out: number[] = [];
  for (let p = from; p <= to; p++) out.push(p - 1);
  return out;
}

/**
 * "1,5-8,12" -> groups, in the order typed, duplicates dropped. Strict: a
 * token that is not a page or a range is an error rather than silently
 * ignored, so a typo cannot quietly produce the wrong files.
 */
export function parsePageSelection(spec: string, total: number): PageRange[] {
  const tokens = spec
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    throw new SplitPlanError('Enter the pages to extract, for example "1,5-8,12".');
  }

  const ranges: PageRange[] = [];
  for (const token of tokens) {
    const range = token.match(/^(\d+)\s*-\s*(\d+)$/);
    const single = token.match(/^\d+$/);
    if (!range && !single) {
      throw new SplitPlanError(`"${token}" is not a page number or a range like 5-8.`);
    }
    const from = parseInt(range ? range[1] : token, 10);
    const to = range ? parseInt(range[2], 10) : from;
    checkPage(from, total, `"${token}"`);
    checkPage(to, total, `"${token}"`);
    if (from > to) {
      throw new SplitPlanError(`"${token}" runs backwards — write it as ${to}-${from}.`);
    }
    ranges.push({ from, to });
  }
  return ranges;
}

export function planSplit(options: SplitOptions, total: number): SplitPlan {
  if (!Number.isInteger(total) || total < 1) {
    throw new SplitPlanError("This PDF has no pages.");
  }

  let files: SplitGroup[];

  switch (options.mode) {
    case "custom": {
      if (options.ranges.length === 0) throw new SplitPlanError("Add at least one range.");
      files = options.ranges.map(({ from, to }, i) => {
        const where = `Range ${i + 1}`;
        checkPage(from, total, where);
        checkPage(to, total, where);
        if (from > to) {
          throw new SplitPlanError(`${where} starts after it ends (page ${from} to ${to}).`);
        }
        return { label: rangeLabel(from, to), pages: span(from, to) };
      });
      break;
    }
    case "fixed": {
      const size = options.size;
      if (!Number.isInteger(size) || size < 1) {
        throw new SplitPlanError("Pages per file must be a whole number of 1 or more.");
      }
      if (size > total) {
        throw new SplitPlanError(
          `Pages per file (${size}) is more than this PDF has (${plural(total, "page")}).`
        );
      }
      files = [];
      for (let from = 1; from <= total; from += size) {
        const to = Math.min(total, from + size - 1);
        files.push({ label: rangeLabel(from, to), pages: span(from, to) });
      }
      break;
    }
    case "all": {
      files = span(1, total).map((i) => ({ label: String(i + 1), pages: [i] }));
      break;
    }
    case "select": {
      // Each selected page is its own file; duplicates are dropped, order kept.
      const seen = new Set<number>();
      files = [];
      for (const { from, to } of parsePageSelection(options.pages, total)) {
        for (const i of span(from, to)) {
          if (seen.has(i)) continue;
          seen.add(i);
          files.push({ label: String(i + 1), pages: [i] });
        }
      }
      break;
    }
    default:
      throw new SplitPlanError("Unknown split mode.");
  }

  if (options.merge && files.length > 1) {
    return {
      files: [{ label: mergedLabel(files), pages: files.flatMap((f) => f.pages) }],
      single: true,
    };
  }

  if (files.length > MAX_SPLIT_FILES) {
    throw new SplitPlanError(
      `That would create ${files.length} files; the limit is ${MAX_SPLIT_FILES}. Use larger ranges or tick "merge".`
    );
  }

  return { files, single: files.length === 1 };
}

/**
 * The merged file's name: its pages in order with consecutive runs collapsed
 * ("1-3,10-12", or "1-12" for every page), shortened when it gets long.
 */
function mergedLabel(files: SplitGroup[]): string {
  const pages = files.flatMap((f) => f.pages).map((i) => i + 1);
  const parts: string[] = [];
  for (let i = 0; i < pages.length; ) {
    let j = i;
    while (j + 1 < pages.length && pages[j + 1] === pages[j] + 1) j++;
    parts.push(rangeLabel(pages[i], pages[j]));
    i = j + 1;
  }
  const joined = parts.join(",");
  return joined.length <= 40 ? joined : "merged";
}

/** "report.pdf" -> "report". */
export function baseName(filename: string): string {
  return filename.replace(/\.pdf$/i, "").trim() || "document";
}

/** "<original> 1-3.pdf" */
export function splitFileName(original: string, group: SplitGroup): string {
  return `${baseName(original)} ${group.label}.pdf`;
}

/** The download's name: the PDF itself, or a ZIP named after the original. */
export function splitDownloadName(original: string, plan: SplitPlan): string {
  return plan.single ? splitFileName(original, plan.files[0]) : `${baseName(original)} split.zip`;
}

/**
 * Untrusted JSON from the form -> SplitOptions, or a SplitPlanError. The route
 * cannot assume the page sent it.
 */
export function parseSplitOptions(raw: unknown): SplitOptions {
  if (!raw || typeof raw !== "object") throw new SplitPlanError("Missing split options.");
  const o = raw as Record<string, unknown>;
  const merge = o.merge === true;
  const int = (v: unknown) => (typeof v === "number" ? v : parseInt(String(v ?? ""), 10));

  switch (o.mode) {
    case "custom": {
      if (!Array.isArray(o.ranges)) throw new SplitPlanError("Add at least one range.");
      if (o.ranges.length > MAX_SPLIT_FILES) throw new SplitPlanError("Too many ranges.");
      const ranges = o.ranges.map((r) => {
        const rr = (r ?? {}) as Record<string, unknown>;
        return { from: int(rr.from), to: int(rr.to) };
      });
      return { mode: "custom", ranges, merge };
    }
    case "fixed":
      return { mode: "fixed", size: int(o.size), merge };
    case "all":
      return { mode: "all", merge };
    case "select":
      return { mode: "select", pages: String(o.pages ?? "").slice(0, 2000), merge };
    default:
      throw new SplitPlanError("Unknown split mode.");
  }
}
