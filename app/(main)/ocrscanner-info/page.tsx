import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "OCR Scanner",
    description: "Convert scanned PDFs and images into fully editable searchable text.",
    alternates: { canonical: "/ocrscanner-info" },
};

export default function OCRScannerInfoPage() {
    return (
        <ContentPage title="OCR Scanner" intro="Convert scanned PDFs and images into fully editable searchable text.">
            <Section heading="What it does">
                <p>Our advanced OCR (Optical Character Recognition) scanner transforms static images and non-searchable scanned PDFs into fully editable, selectable text documents with high accuracy.</p>
                <p>Extract text seamlessly from receipts, scanned certificates, or legacy documents, making your physical archives completely searchable and digital-ready in seconds.</p>
            </Section>
        </ContentPage>
    );
}
