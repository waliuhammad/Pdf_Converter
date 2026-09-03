import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "Translate PDF",
    description: "Translate documents into multiple languages while preserving formatting.",
    alternates: { canonical: "/aitranslate-info" },
};

export default function TranslatePDFInfoPage() {
    return (
        <ContentPage title="Translate PDF" intro="Translate documents into multiple languages while preserving formatting.">
            <Section heading="What it does">
                <p>Break down language barriers with our AI-powered document translator. Translate your PDFs, reports, and manuals into dozens of global languages instantly.</p>
                <p>Our translation tool maintains your document&apos;s original structure, layout, and formatting, ensuring professional results whether for business, academics, or personal use.</p>
            </Section>
        </ContentPage>
    );
}
