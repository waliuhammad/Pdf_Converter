import type { Metadata } from "next";
import { AiInfoPage } from "@/components/marketing/ai-info-page";

export const metadata: Metadata = {
    title: "OCR PDF",
    description: "Extract the text from scanned and image-based PDFs with AI text recognition.",
    alternates: { canonical: "/ocrscanner-info" },
};

export default function OCRScannerInfoPage() {
    return (
        <AiInfoPage
            title="OCR PDF"
            intro="Pull the text out of scanned or photographed PDFs, so you can copy, search and reuse it."
            href="/ocr-pdf"
            toolLabel="OCR PDF"
        >
            <p>A scanned PDF is a picture of a page: you can read it, but you can&apos;t select, copy or search its words. OCR (optical character recognition) reads those pictures and returns the text.</p>
            <p>The text is extracted exactly as written — no summarising, translating or correcting — keeping paragraph order and line breaks, so it can be pasted into an email or document, or fed into the other AI tools.</p>
        </AiInfoPage>
    );
}
