import React from "react";

/**
 * Illustrative tool icons matching the reference design.
 * Clean, modern SVG icons with colored document badges, arrows,
 * scissors, compression marks, shields, pencils, signatures, and drops.
 */

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
  textColor = "#FFFFFF",
  borderOnly = false,
}: FileDocProps) {
  const fold = 6.5;
  const rx = 3.5;

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Base document shape */}
      {borderOnly ? (
        <path
          d={`M${rx},0 H${w - fold} L${w},${fold} V${h - rx} Q${w},${h} ${w - rx},${h} H${rx} Q0,${h} 0,${h - rx} V${rx} Q0,0 ${rx},0 Z`}
          fill="none"
          stroke={color}
          strokeWidth="2"
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

      {/* Format Label */}
      <text
        x={w / 2}
        y={h * 0.65}
        textAnchor="middle"
        dominantBaseline="central"
        fill={textColor}
        fontSize={label.length > 3 ? "5.5" : "6.5"}
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="-0.2px"
      >
        {label}
      </text>
    </g>
  );
}

// Arrow between documents
function FlowArrow({ x = 27, y = 16 }: { x?: number; y?: number }) {
  return (
    <g stroke="currentColor" className="text-gray-600 dark:text-gray-300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <FileDoc w={27} h={34} color="#EF4444" foldColor="#FCA5A5" label="" />
      </g>
      <g opacity="0.75" transform="translate(12, 3) scale(0.98)">
        <FileDoc w={27} h={34} color="#EF4444" foldColor="#FCA5A5" label="" />
      </g>
      <g transform="translate(20, 5)">
        <FileDoc w={27} h={34} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
    </SvgWrapper>
  );
}

// 2. Split PDF: PDF document with scissors cutting
export function SplitPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(8, 3)">
        <FileDoc w={27} h={34} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
      {/* Scissors */}
      <g transform="translate(36, 17)" stroke="#2563EB" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none">
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
        stroke="#EF4444"
        strokeWidth="2.8"
        strokeDasharray="4 3.5"
        strokeLinecap="round"
        opacity="0.75"
      />

      {/* Main Red PDF document - centered and enlarged */}
      <g transform="translate(19, 3)">
        <FileDoc w={27} h={34} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>

      {/* Top-right inward arrow */}
      <g stroke="#EF4444" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="59" y1="5" x2="50" y2="14" />
        <polyline points="57,14 50,14 50,7" fill="none" />
      </g>

      {/* Bottom-right inward arrow */}
      <g stroke="#EF4444" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
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
      <FileDoc x={3} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#2563EB" foldColor="#93C5FD" label="DOCX" />
    </SvgWrapper>
  );
}

// 5. Word to PDF: DOCX -> PDF
export function WordToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#2563EB" foldColor="#93C5FD" label="DOCX" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
    </SvgWrapper>
  );
}

// 6. PDF to Excel: PDF -> XLSX
export function PdfToExcelIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#16A34A" foldColor="#86EFAC" label="XLSX" />
    </SvgWrapper>
  );
}

// 7. Excel to PDF: XLSX -> PDF
export function ExcelToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#16A34A" foldColor="#86EFAC" label="XLSX" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
    </SvgWrapper>
  );
}

// 8. PDF to PowerPoint: PDF -> PPTX
export function PdfToPptIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#EA580C" foldColor="#FED7AA" label="PPTX" />
    </SvgWrapper>
  );
}

// 9. PowerPoint to PDF: PPTX -> PDF
export function PptToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#EA580C" foldColor="#FED7AA" label="PPTX" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
    </SvgWrapper>
  );
}

// 10. PDF to Image: PDF -> JPG
export function PdfToImageIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#D97706" foldColor="#FDE68A" label="JPG" />
    </SvgWrapper>
  );
}

// 11. Image to PDF: PNG -> PDF
export function ImageToPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#0891B2" foldColor="#A5F3FC" label="PNG" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
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
          stroke="#7C3AED"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <polygon points="21,1 27,6 21,11" fill="#7C3AED" />
      </g>
      {/* PDF on the right */}
      <g transform="translate(36, 4)">
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="PDF" />
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
          stroke="#EF4444"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Solid Red Folded Corner */}
        <path
          d="M 18,0 L 28,9.5 H 20 Q 18,9.5 18,7.5 Z"
          fill="#EF4444"
        />

        {/* Cursive Signature stroke inside */}
        <path
          d="M 4,24 C 6,21 8,14 11.5,14 C 13.5,14 14,19 12.5,23 C 11.5,26 13,26 15,22 C 16.5,19 18.5,22 22,20"
          fill="none"
          stroke="#0F172A"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Blue Pen angled at the document cut */}
      <g transform="translate(35, 11) rotate(42)">
        {/* Pen Body with highlights */}
        <rect x="0" y="0" width="7" height="21" rx="2" fill="#2563EB" />
        <rect x="1" y="2" width="1.8" height="17" rx="0.9" fill="#60A5FA" opacity="0.6" />
        {/* Pen Tip */}
        <polygon points="0,21 7,21 3.5,28" fill="#1D4ED8" />
        {/* White tip accent */}
        <polygon points="2,23 5,23 3.5,26" fill="#FFFFFF" />
        {/* Nib point */}
        <circle cx="3.5" cy="28.5" r="0.8" fill="#0F172A" />
      </g>
    </SvgWrapper>
  );
}

// 14. Watermark PDF: PDF with a water drop
export function WatermarkPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
      {/* Water drop */}
      <g transform="translate(37, 16)">
        <path
          d="M9,0 C9,0 0,11 0,16 C0,21 4,25 9,25 C14,25 18,21 18,16 C18,11 9,0 9,0 Z"
          fill="#3B82F6"
        />
      </g>
    </SvgWrapper>
  );
}

// 15. Sign PDF: PDF with signature pen and signature line
export function SignPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="" />
        {/* Signature on doc */}
        <path
          d="M5,22 Q9,16 13,22 T20,18"
          fill="none"
          stroke="#1E293B"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      {/* Pen angled */}
      <g transform="translate(36, 12) rotate(35)">
        <rect x="0" y="0" width="6" height="18" rx="2" fill="#3B82F6" />
        <polygon points="0,18 6,18 3,25" fill="#F59E0B" />
        <circle cx="3" cy="24" r="0.8" fill="#1E293B" />
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
          fill="#3B82F6"
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
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
    </SvgWrapper>
  );
}

// 17. Unlock PDF: Open Padlock
export function UnlockPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
      <g transform="translate(36, 12)">
        <rect x="0" y="9" width="16" height="12" rx="2" fill="#F59E0B" />
        {/* Open shackle */}
        <path
          d="M3,9 V5 A5,5 0 0,1 13,5"
          fill="none"
          stroke="#F59E0B"
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
        <FileDoc color="#7C3AED" foldColor="#C4B5FD" label="AI" />
      </g>
      <g fill="#7C3AED" transform="translate(39, 7)">
        {/* Main 4-point sparkle */}
        <path d="M10,0 L12,7 L19,9 L12,11 L10,18 L8,11 L1,9 L8,7 Z" />
        {/* Secondary sparkle */}
        <path d="M19,16 L20,19 L23,20 L20,21 L19,24 L18,21 L15,20 L18,19 Z" opacity="0.8" />
        {/* Accent sparkle dots */}
        <circle cx="5" cy="22" r="1.3" fill="#A855F7" opacity="0.9" />
        <circle cx="21" cy="5" r="1.1" fill="#C4B5FD" opacity="0.9" />
      </g>
    </SvgWrapper>
  );
}

// 19. OCR PDF: Scanning corners
export function OcrPdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      </g>
      <g stroke="#7C3AED" strokeWidth="2.2" strokeLinecap="round" fill="none" transform="translate(37, 6)">
        <path d="M6,0 H0 V6" />
        <path d="M18,0 H24 V6" />
        <path d="M6,26 H0 V20" />
        <path d="M18,26 H24 V20" />
        {/* Scan lines */}
        <line x1="5" y1="8" x2="19" y2="8" strokeWidth="1.5" />
        {/* Active laser beam */}
        <line x1="2" y1="13" x2="22" y2="13" stroke="#EC4899" strokeWidth="1.8" opacity="0.95" />
        <line x1="5" y1="18" x2="17" y2="18" strokeWidth="1.5" />
      </g>
    </SvgWrapper>
  );
}

// 20. Translate PDF
export function TranslatePdfIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <FileDoc x={3} y={4} color="#EF4444" foldColor="#FCA5A5" label="PDF" />
      <FlowArrow x={30} y={20} />
      <FileDoc x={41} y={4} color="#7C3AED" foldColor="#C4B5FD" label="A/文" />
    </SvgWrapper>
  );
}

// 21. Grammar Checker
export function GrammarIcon({ size = 56 }: { size?: number }) {
  return (
    <SvgWrapper size={size}>
      <g transform="translate(10, 4)">
        <FileDoc color="#7C3AED" foldColor="#C4B5FD" label="ABC" />
        {/* Red wavy spellcheck underline under text */}
        <path
          d="M5,25.5 Q7.5,24 10,25.5 T15,25.5 T20,25.5"
          fill="none"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(38, 12)">
        <circle cx="10" cy="10" r="10" fill="#16A34A" />
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
