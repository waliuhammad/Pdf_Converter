import type { Metadata } from "next";
import { AiInfoPage } from "@/components/marketing/ai-info-page";

export const metadata: Metadata = {
    title: "Translate PDF",
    description: "Translate PDF documents into over 100 languages with AI, as text or as a layout-preserving PDF.",
    alternates: { canonical: "/aitranslate-info" },
};

export default function TranslatePDFInfoPage() {
    return (
        <AiInfoPage
            title="Translate PDF"
            intro="Translate a PDF into another language, as plain text or as a PDF that keeps the original layout."
            href="/translate"
            toolLabel="Translate PDF"
        >
            <p>Translate PDF works in two ways. Text output gives you the translated text to read and copy. PDF output rebuilds the document with each line translated in place, so headings, columns and page layout stay where they were.</p>
            <p>Over 100 target languages are available, including right-to-left languages such as Arabic and Urdu, which are laid out in the correct direction.</p>
        </AiInfoPage>
    );
}
