import React from "react";

/**
 * Illustrative tool icons matching the modern reference design.
 * Features a friendly, lighter color palette and crisp, high-contrast
 * white badge tags so format labels ("PDF", "DOCX", etc.) are effortlessly readable.
 */

// ─── Color Palette ─────────────────────────────────────────────────────────────
// Lighter, softer, vibrant shades replacing previously heavy/dark 600-series colors.
export const ICON_COLORS = {
  // PDF Red (lighter, softer coral-red instead of dark heavy red #EF4444)
  pdf: {
    bg: "#FF6B6B",
    fold: "#FECACA",
    text: "#DC2626", // rich crisp red on white badge
  },
  // Word DOCX Blue (lighter, vibrant sky-blue instead of dark #2563EB)
  word: {
    bg: "#4FA3F7",
    fold: "#BFDBFE",
    text: "#1D4ED8", // rich crisp blue on white badge
    accent: "#60A5FA",
  },
  // Excel XLSX Green (lighter, fresh emerald-green instead of dark forest #16A34A)
  excel: {
    bg: "#34D399",
    fold: "#A7F3D0",
    text: "#047857", // rich crisp green on white badge
  },
  // PowerPoint PPTX Orange (lighter, warm peach-orange instead of dark burnt #EA580C)
  ppt: {
    bg: "#FB923C",
    fold: "#FED7AA",
    text: "#C2410C", // rich crisp orange on white badge
  },
  // JPG Amber (lighter warm gold instead of dark muddy #D97706)
  jpg: {
    bg: "#FBBF24",
    fold: "#FDE68A",
    text: "#B45309", // rich crisp amber on white badge
  },
  // PNG Cyan (lighter sky-cyan instead of dark #0891B2)
  png: {
    bg: "#38BDF8",
    fold: "#BAE6FD",
    text: "#0284C7", // rich crisp cyan on white badge
  },
  // AI / Translate / Grammar Violet (lighter soft purple instead of dark deep #7C3AED)
  purple: {
    bg: "#A78BFA",
    fold: "#DDD6FE",
    text: "#6D28D9", // rich crisp purple on white badge
    accent: "#8B5CF6",
  },
  // Accents
  shield: "#60A5FA",
  lock: "#FBBF24",
  drop: "#60A5FA",
  scissors: "#60A5FA",
  laser: "#F472B6",
  check: "#22C55E",
};

// ─── Document badge primitive ──────────────────────────────────────────────────
interface FileDocProps {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color: string;
  foldColor: string;
  label: string;
  textColor?: string;
  borderOnly?: boolean;
}

function FileDoc({
  x = 0,
  y = 0,
  w = 26,
  h = 32,
  color,
  foldColor,
  label,
  textColor,
  borderOnly = false,
}: FileDocProps) {
  const fold = 6.5;
  const rx = 3.5;
  const textFill = textColor || color;

  // Proportional white badge box positioning inside the lower section
  const badgeH = 13.5;
  const badgeY = h - badgeH - 3.5;
  const badgeW = w - 4.5;
  const badgeX = 2.25;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Base document shape */}
      {borderOnly ? (
        <path
          d={`M${rx},0 H${w - fold} L${w},${fold} V${h - rx} Q${w},${h} ${w - rx},${h} H${rx} Q0,${h} 0,${h - rx} V${rx} Q0,0 ${rx},0 Z`}
          fill="none"
          stroke={color}
          strokeWidth="2.2"
        />
      ) : (
        <path
          d={`M${rx},0 H${w - fold} L${w},${fold} V${h - rx} Q${w},${h} ${w - rx},${h} H${rx} Q0,${h} 0,${h - rx} V${rx} Q0,0 ${rx},0 Z`}
          fill={color}
        />
      )}

      {/* Folded corner */}
      <path
        d={`M${w - fold},0 L${w},${fold} H${w - fold + 1.5} Q${w - fold},${fold} ${w - fold},${fold - 1.5} Z`}
        fill={foldColor}
      />

      {/* Format Label with clean, high-contrast white badge tag for maximum readability */}
      {label ? (
        <g>
          {/* White badge box/pill */}
          <rect
            x={badgeX}
            y={badgeY}
            width={badgeW}
            height={badgeH}
            rx={2.5}
            fill="#FFFFFF"
          />

          {/* Crisp, prominent format label */}
          <text
            x={w / 2}
            y={badgeY + badgeH / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={textFill}
            fontSize={
              label.length > 3
                ? "6.6"
                : label.includes("/")
                ? "6.2"
                : label.length > 2
                ? "7.6"
                : "8.6"
            }
            fontWeight="900"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            letterSpacing={label.length > 3 ? "-0.2px" : "0.1px"}
          >
            {label}
          </text>
        </g>
      ) : null}
    </g>
  );
}

// Arrow between documents
function FlowArrow({ x = 27, y = 16 }: { x?: number; y?: number }) {
  return (
    <g stroke="currentColor" className="text-slate-400 dark:text-slate-400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1={x} y1={y} x2={x + 10} y2={y} />
      <polyline points={`${x + 7},${y - 3.5} ${x + 10.5},${y} ${x + 7},${y + 3.5}`} fill="none" />
    </g>
  );
}

// Icon Wrapper
function SvgWrapper({ children, size = 56 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 68 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 select-none overflow-visible"
    >
      {children}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Merge PDF: Multiple stacked red PDF documents
export function MergePdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g opacity="0.45" transform="translate(4, 1) scale(0.96)">
        <FileDoc w={27} h={34} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="" />
      </g>
      <g opacity="0.75" transform="translate(12, 3) scale(0.98)">
        <FileDoc w={27} h={34} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="" />
      </g>
      <g transform="translate(20, 5)">
        <FileDoc w={27} h={34} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
    </SvgWrapper>
  );
}

// 2. Split PDF: PDF document with scissors cutting
export function SplitPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(8, 3)">
        <FileDoc w={27} h={34} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
      {/* Scissors */}
      <g transform="translate(36, 17)" stroke={ICON_COLORS.scissors} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="5" cy="5" r="4" />
        <circle cx="5" cy="15" r="4" />
        <line x1="8.5" y1="6.8" x2="20" y2="16" />
        <line x1="8.5" y1="13.2" x2="20" y2="4" />
      </g>
    </SvgWrapper>
  );
}

// 3. Compress PDF: Red PDF with arrows pointing inwards
export function CompressPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      {/* Left dashed reference line */}
      <line
        x1="14"
        y1="6"
        x2="14"
        y2="34"
        stroke={ICON_COLORS.pdf.bg}
        strokeWidth="2.8"
        strokeDasharray="4 3.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Main Red PDF document - centered and enlarged */}
      <g transform="translate(19, 3)">
        <FileDoc w={27} h={34} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>

      {/* Top-right inward arrow */}
      <g stroke={ICON_COLORS.pdf.bg} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="59" y1="5" x2="50" y2="14" />
        <polyline points="57,14 50,14 50,7" fill="none" />
      </g>

      {/* Bottom-right inward arrow */}
      <g stroke={ICON_COLORS.pdf.bg} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="59" y1="35" x2="50" y2="26" />
        <polyline points="57,26 50,26 50,33" fill="none" />
      </g>
    </SvgWrapper>
  );
}

// 4. PDF to Word: PDF -> DOCX
export function PdfToWordIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.word.bg} foldColor={ICON_COLORS.word.fold} label="DOCX" textColor={ICON_COLORS.word.text} />
    </SvgWrapper>
  );
}

// 5. Word to PDF: DOCX -> PDF
export function WordToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.word.bg} foldColor={ICON_COLORS.word.fold} label="DOCX" textColor={ICON_COLORS.word.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
    </SvgWrapper>
  );
}

// 6. PDF to Excel: PDF -> XLSX
export function PdfToExcelIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.excel.bg} foldColor={ICON_COLORS.excel.fold} label="XLSX" textColor={ICON_COLORS.excel.text} />
    </SvgWrapper>
  );
}

// 7. Excel to PDF: XLSX -> PDF
export function ExcelToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.excel.bg} foldColor={ICON_COLORS.excel.fold} label="XLSX" textColor={ICON_COLORS.excel.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
    </SvgWrapper>
  );
}

// 8. PDF to PowerPoint: PDF -> PPTX
export function PdfToPptIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.ppt.bg} foldColor={ICON_COLORS.ppt.fold} label="PPTX" textColor={ICON_COLORS.ppt.text} />
    </SvgWrapper>
  );
}

// 9. PowerPoint to PDF: PPTX -> PDF
export function PptToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.ppt.bg} foldColor={ICON_COLORS.ppt.fold} label="PPTX" textColor={ICON_COLORS.ppt.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
    </SvgWrapper>
  );
}

// 10. PDF to Image: PDF -> JPG
export function PdfToImageIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.jpg.bg} foldColor={ICON_COLORS.jpg.fold} label="JPG" textColor={ICON_COLORS.jpg.text} />
    </SvgWrapper>
  );
}

// 11. Image to PDF: PNG -> PDF
export function ImageToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.png.bg} foldColor={ICON_COLORS.png.fold} label="PNG" textColor={ICON_COLORS.png.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
    </SvgWrapper>
  );
}

// 12. Rotate PDF: Circular arrow + PDF
export function RotatePdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      {/* Circular arrow on the left */}
      <g transform="translate(6, 6)">
        <path
          d="M20,6 A12,12 0 1,0 24,18"
          fill="none"
          stroke={ICON_COLORS.purple.accent}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polygon points="21,1 27,6 21,11" fill={ICON_COLORS.purple.accent} />
      </g>
      {/* PDF on the right */}
      <g transform="translate(36, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
    </SvgWrapper>
  );
}

// 13. Edit PDF: Red outlined document with solid red fold, cursive signature, and blue pen
export function EditPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 3)">
        {/* Document with red border outline and open cut on right for the pen */}
        <path
          d="M 3.5,0 H 18.5 L 28,9.5 V 14 M 28,26 V 30.5 Q 28,34 24.5,34 H 3.5 Q 0,34 0,30.5 V 3.5 Q 0,0 3.5,0 Z"
          fill="none"
          stroke={ICON_COLORS.pdf.bg}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Folded Corner */}
        <path
          d="M 18,0 L 28,9.5 H 20 Q 18,9.5 18,7.5 Z"
          fill={ICON_COLORS.pdf.fold}
        />

        {/* Cursive Signature stroke inside */}
        <path
          d="M 4,24 C 6,21 8,14 11.5,14 C 13.5,14 14,19 12.5,23 C 11.5,26 13,26 15,22 C 16.5,19 18.5,22 22,20"
          fill="none"
          stroke="#475569"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Lighter Blue Pen angled at the document cut */}
      <g transform="translate(35, 11) rotate(42)">
        {/* Pen Body with highlights */}
        <rect x="0" y="0" width="7" height="21" rx="2" fill={ICON_COLORS.word.accent} />
        <rect x="1" y="2" width="1.8" height="17" rx="0.9" fill="#BFDBFE" opacity="0.8" />
        {/* Pen Tip */}
        <polygon points="0,21 7,21 3.5,28" fill={ICON_COLORS.word.bg} />
        {/* White tip accent */}
        <polygon points="2,23 5,23 3.5,26" fill="#FFFFFF" />
        {/* Nib point */}
        <circle cx="3.5" cy="28.5" r="0.8" fill="#334155" />
      </g>
    </SvgWrapper>
  );
}

// 14. Watermark PDF: PDF with a water drop
export function WatermarkPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
      {/* Water drop */}
      <g transform="translate(37, 16)">
        <path
          d="M9,0 C9,0 0,11 0,16 C0,21 4,25 9,25 C14,25 18,21 18,16 C18,11 9,0 9,0 Z"
          fill={ICON_COLORS.drop}
        />
        {/* Soft highlight reflection */}
        <ellipse cx="6" cy="15" rx="2.5" ry="4" fill="#FFFFFF" opacity="0.45" transform="rotate(-20 6 15)" />
      </g>
    </SvgWrapper>
  );
}

// 15. Sign PDF: PDF with signature pen and signature line
export function SignPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="" />
        {/* Signature on doc */}
        <path
          d="M5,22 Q9,16 13,22 T20,18"
          fill="none"
          stroke="#475569"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
      {/* Pen angled */}
      <g transform="translate(36, 12) rotate(35)">
        <rect x="0" y="0" width="6" height="18" rx="2" fill={ICON_COLORS.word.accent} />
        <polygon points="0,18 6,18 3,25" fill={ICON_COLORS.jpg.bg} />
        <circle cx="3" cy="24" r="0.8" fill="#334155" />
      </g>
    </SvgWrapper>
  );
}

// 16. Protect PDF: Blue shield + Lock + PDF
export function ProtectPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      {/* Blue shield on left */}
      <g transform="translate(6, 4)">
        <path
          d="M0,4 L13,0 L26,4 V16 C26,24 13,31 13,31 C13,31 0,24 0,16 Z"
          fill={ICON_COLORS.shield}
        />
        {/* White lock */}
        <rect x="8" y="14" width="10" height="8" rx="1.5" fill="#FFFFFF" />
        <path
          d="M10,14 V11 A3,3 0 0,1 16,11 V14"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {/* PDF on right */}
      <g transform="translate(38, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
    </SvgWrapper>
  );
}

// 17. Unlock PDF: Open Padlock
export function UnlockPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
      <g transform="translate(36, 12)">
        <rect x="0" y="9" width="16" height="12" rx="2.5" fill={ICON_COLORS.lock} />
        {/* Open shackle */}
        <path
          d="M3,9 V5 A5,5 0 0,1 13,5"
          fill="none"
          stroke={ICON_COLORS.lock}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="15" r="2" fill="#FFFFFF" />
      </g>
    </SvgWrapper>
  );
}

// 18. AI Summary / Sparkle
export function AiSummaryIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.purple.bg} foldColor={ICON_COLORS.purple.fold} label="AI" textColor={ICON_COLORS.purple.text} />
      </g>
      <g fill={ICON_COLORS.purple.accent} transform="translate(39, 7)">
        {/* Main 4-point sparkle */}
        <path d="M10,0 L12,7 L19,9 L12,11 L10,18 L8,11 L1,9 L8,7 Z" />
        {/* Secondary sparkle */}
        <path d="M19,16 L20,19 L23,20 L20,21 L19,24 L18,21 L15,20 L18,19 Z" fill="#C084FC" opacity="0.9" />
        {/* Accent sparkle dots */}
        <circle cx="5" cy="22" r="1.3" fill="#C084FC" opacity="0.9" />
        <circle cx="21" cy="5" r="1.1" fill={ICON_COLORS.purple.fold} opacity="0.9" />
      </g>
    </SvgWrapper>
  );
}

// 19. OCR PDF: Scanning corners
export function OcrPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      </g>
      <g stroke={ICON_COLORS.purple.accent} strokeWidth="2.2" strokeLinecap="round" fill="none" transform="translate(37, 6)">
        <path d="M6,0 H0 V6" />
        <path d="M18,0 H24 V6" />
        <path d="M6,26 H0 V20" />
        <path d="M18,26 H24 V20" />
        {/* Scan lines */}
        <line x1="5" y1="8" x2="19" y2="8" strokeWidth="1.5" stroke="#C4B5FD" />
        {/* Active laser beam */}
        <line x1="2" y1="13" x2="22" y2="13" stroke={ICON_COLORS.laser} strokeWidth="2" opacity="0.95" />
        <line x1="5" y1="18" x2="17" y2="18" strokeWidth="1.5" stroke="#C4B5FD" />
      </g>
    </SvgWrapper>
  );
}

// 20. Translate PDF
export function TranslatePdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color={ICON_COLORS.pdf.bg} foldColor={ICON_COLORS.pdf.fold} label="PDF" textColor={ICON_COLORS.pdf.text} />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color={ICON_COLORS.purple.bg} foldColor={ICON_COLORS.purple.fold} label="A/文" textColor={ICON_COLORS.purple.text} />
    </SvgWrapper>
  );
}

// 21. Grammar Checker
export function GrammarIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color={ICON_COLORS.purple.bg} foldColor={ICON_COLORS.purple.fold} label="ABC" textColor={ICON_COLORS.purple.text} />
        {/* Red wavy spellcheck underline under text */}
        <path
          d="M5,26 Q7.5,24.5 10,26 T15,26 T20,26"
          fill="none"
          stroke={ICON_COLORS.pdf.bg}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(38, 12)">
        <circle cx="10" cy="10" r="10" fill={ICON_COLORS.check} />
        <polyline
          points="6,10 9,13 14,7"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </SvgWrapper>
  );
}

// ─── Master lookup ────────────────────────────────────────────────────────────
export function getToolIllustration(href: string, size = 56): React.ReactNode | null {
  const h = href.toLowerCase();
  if (h.includes("merge"))          return <MergePdfIcon size={size} />;
  if (h.includes("split"))          return <SplitPdfIcon size={size} />;
  if (h.includes("compress"))       return <CompressPdfIcon size={size} />;
  if (h.includes("rotate"))         return <RotatePdfIcon size={size} />;
  if (h.includes("pdf-to-word"))    return <PdfToWordIcon size={size} />;
  if (h.includes("word-to-pdf"))    return <WordToPdfIcon size={size} />;
  if (h.includes("pdf-to-excel"))   return <PdfToExcelIcon size={size} />;
  if (h.includes("excel-to-pdf"))   return <ExcelToPdfIcon size={size} />;
  if (h.includes("pdf-to-ppt") || h.includes("pdf-to-powerpoint")) return <PdfToPptIcon size={size} />;
  if (h.includes("ppt-to-pdf") || h.includes("powerpoint-to-pdf")) return <PptToPdfIcon size={size} />;
  if (h.includes("pdf-to-image"))   return <PdfToImageIcon size={size} />;
  if (h.includes("image-to-pdf"))   return <ImageToPdfIcon size={size} />;
  if (h.includes("edit-pdf"))       return <EditPdfIcon size={size} />;
  if (h.includes("watermark"))      return <WatermarkPdfIcon size={size} />;
  if (h.includes("sign"))           return <SignPdfIcon size={size} />;
  if (h.includes("protect"))        return <ProtectPdfIcon size={size} />;
  if (h.includes("unlock"))         return <UnlockPdfIcon size={size} />;
  if (h.includes("ocr"))            return <OcrPdfIcon size={size} />;
  if (h.includes("summarize") || h.includes("summary")) return <AiSummaryIcon size={size} />;
  if (h.includes("translate"))      return <TranslatePdfIcon size={size} />;
  if (h.includes("grammar") || h.includes("spell")) return <GrammarIcon size={size} />;
  return null;
}
