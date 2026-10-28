import type { Metadata } from "next";
import { AiInfoPage } from "@/components/marketing/ai-info-page";

export const metadata: Metadata = {
    title: "AI Summary",
    description: "Summarise long PDF reports, papers and contracts into a few key points with AI.",
    alternates: { canonical: "/aisummary-info" },
};

export default function AISummaryInfoPage() {
    return (
        <AiInfoPage
            title="AI Summary"
            intro="Get the main points of a long PDF — a report, paper or contract — as a short list you can read in a minute."
            href="/summarize-pdf"
            toolLabel="AI Summary"
        >
            <p>AI Summary reads the text of your PDF and condenses it into up to five key points, in under 150 words. It is meant for deciding whether a document needs a full read, recalling what a report said, or getting the gist of something outside your field.</p>
            <p>CVs and résumés get a summary shaped for them — the candidate&apos;s experience and skills rather than a generic overview.</p>
        </AiInfoPage>
    );
}
