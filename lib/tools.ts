import { TOOL_PATHS } from "@/lib/tool-paths";
import {
    Combine,
    ScissorsLineDashed,
    Shrink,
    RefreshCw,
    FileType2,
    FileOutput,
    ImageDown,
    ImagePlus,
    TableProperties,
    Presentation,
    Stamp,
    PenLine,
    PenTool,
    ShieldCheck,
    ShieldOff,
    ScanLine,
    BrainCircuit,
    Languages,
    SpellCheck2,
    type LucideIcon,
} from "lucide-react";

export interface Tool {
    name: string;
    description: string;
    icon: LucideIcon;
    href: string;
    category: string;
    badge?: string;
    /** No page exists yet — rendered as a non-clickable card instead of a dead link. */
    comingSoon?: boolean;
}

export const tools: Tool[] = [
    {
        name: "Merge PDF",
        description: "Combine multiple PDF files into one.",
        icon: Combine,
        href: "/merge-pdf",
        category: "Organize",
        badge: "Popular",
    },
    {
        name: "Split PDF",
        description: "Extract pages from any PDF.",
        icon: ScissorsLineDashed,
        href: "/split-pdf",
        category: "Organize",
    },
    {
        name: "Compress PDF",
        description: "Reduce PDF file size quickly.",
        icon: Shrink,
        href: "/compress-pdf",
        category: "Edit",
    },
    {
        name: "Rotate PDF",
        description: "Rotate pages to the correct orientation.",
        icon: RefreshCw,
        href: "/rotate-pdf",
        category: "Organize",
    },
    {
        name: "PDF to Word",
        description: "Convert PDF into editable Word files.",
        icon: FileType2,
        href: "/pdf-to-word",
        category: "Convert",

    },
    {
        name: "Word to PDF",
        description: "Convert Word documents into PDF.",
        icon: FileOutput,
        href: "/word-to-pdf",
        category: "Convert",
    },
    {
        name: "PDF to Image",
        description: "Convert PDF pages into images.",
        icon: ImageDown,
        href: "/pdf-to-image",
        category: "Convert",
    },
    {
        name: "Image to PDF",
        description: "Convert images into a PDF file.",
        icon: ImagePlus,
        href: "/image-to-pdf",
        category: "Convert",
    },
    {
        name: "PDF to Excel",
        description: "Convert PDF tables into spreadsheets.",
        icon: TableProperties,
        href: "/pdf-to-excel",
        category: "Convert",
    },
    {
        name: "Excel to PDF",
        description: "Convert spreadsheets into PDFs.",
        icon: TableProperties,
        href: "/excel-to-pdf",
        category: "Convert",
    },
    {
        name: "PDF to PPT",
        description: "Convert PDF into editable slides.",
        icon: Presentation,
        href: "/pdf-to-ppt",
        category: "Convert",
    },
    {
        name: "PPT to PDF",
        description: "Convert presentations into PDF.",
        icon: Presentation,
        href: "/ppt-to-pdf",
        category: "Convert",
    },
    {
        name: "Watermark PDF",
        description: "Add text or image watermarks.",
        icon: Stamp,
        href: "/watermark-pdf",
        category: "Edit",
    },
    {
        name: "Sign PDF",
        description: "Add digital signatures instantly.",
        icon: PenLine,
        href: "/sign-pdf",
        category: "Edit",
    },
    {
        name: "Edit PDF",
        description: "Edit text and images inside PDFs.",
        icon: PenTool,
        href: "/edit-pdf",
        category: "Edit",
    },
    {
        name: "Protect PDF",
        description: "Encrypt PDF files with passwords.",
        icon: ShieldCheck,
        href: "/protect-pdf",
        category: "Security",
    },
    {
        name: "Unlock PDF",
        description: "Remove password protection.",
        icon: ShieldOff,
        href: "/unlock-pdf",
        category: "Security",
    },
    {
        name: "OCR PDF",
        description: "Extract text from scanned PDFs.",
        icon: ScanLine,
        href: "/ocr-pdf", // matches your folder name
        category: "AI Tools",
        badge: "New",
    },
    {
        name: "AI Summary",
        description: "Generate document summaries instantly.",
        icon: BrainCircuit,
        href: "/summarize-pdf",
        category: "AI Tools",
        badge: "AI",
    },
    {
        name: "Translate PDF",
        description: "Translate your documents.",
        icon: Languages,
        href: "/translate",
        category: "AI Tools",
        badge: "AI",
    },
    {
        name: "Grammar Checker",
        description: "Check grammar and spelling of your documents.",
        icon: SpellCheck2,
        href: "/grammar", // Updated to just "grammar"
        category: "AI Tools",
        badge: "New",
    },
];
/**
 * lib/tool-paths.ts holds the same routes without the icons, so the navbar can
 * ask "is this a tool page" without pulling twenty icon components into every
 * marketing page. Drift between the two would leave a tool's page with no
 * highlighted nav link and nothing to explain why, so it is caught here.
 *
 * Development only: this is a wiring mistake, not a condition to check on every
 * production request.
 */
if (process.env.NODE_ENV !== "production") {
    const known = new Set(TOOL_PATHS);
    const missing = tools.map((t) => t.href).filter((href) => !known.has(href));

    if (missing.length) {
        console.error(
            `lib/tool-paths.ts is missing ${missing.join(", ")} — add them, or the ` +
            "navbar will not highlight Tools on those pages."
        );
    }
}
