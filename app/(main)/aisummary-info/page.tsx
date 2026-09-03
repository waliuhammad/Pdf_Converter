import type { Metadata } from "next";
import { ContentPage, Section } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "AI Summary",
    description: "Generate concise summaries from lengthy reports, books and documents.",
    alternates: { canonical: "/aisummary-info" },
};

export default function AISummaryInfoPage() {
    return (
        <ContentPage title="AI Summary" intro="Generate concise summaries from lengthy reports, books and documents.">
            <Section heading="What it does">
                <p>Save hours of reading time. The AI Summary tool scans massive documents and instantly condenses key points, executive summaries, and action items into a clean overview.</p>
                <p>Whether you are reviewing academic papers, extensive contracts, or industry reports, AI Summary extracts the most vital details so you can grasp the core content in seconds.</p>
            </Section>
        </ContentPage>
    );
}
