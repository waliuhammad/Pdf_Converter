import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "Grammar",
    description: "Check grammar and spelling of your document.",
    alternates: { canonical: "/aigrammar-info" },
};

export default function GrammarInfoPage() {
    return (
        <ContentPage title="Grammar" intro="Check grammar and spelling of your document.">
            <Section heading="What it does">
                <p>Elevate your writing quality with our intelligent grammar and spelling checker. It thoroughly scans your documents to catch typos, grammatical errors, and stylistic issues instantly.</p>
                <p>Whether you are polishing professional emails, academic papers, or official reports, ensure your content is clear, concise, and error-free every single time.</p>
            </Section>
        </ContentPage>
    );
}
