import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, Section } from "@/components/marketing/content-page";
import { tools } from "@/lib/tools";

export const metadata: Metadata = {
    title: "About",
    description: "What PDFAI is and how it handles your documents.",
};

export default function AboutPage() {
    const categories = Array.from(new Set(tools.map((t) => t.category)));

    return (
        <ContentPage
            title="About PDFAI"
            intro="PDFAI is a single place to convert, edit, organise and secure PDF files, with AI features for reading long documents."
        >
            <Section heading="What it does">
                <p>
                    Most PDF work means juggling separate tools — one to merge, another to compress,
                    a third to convert to Word. PDFAI puts {tools.length} of them behind one
                    interface, grouped into {categories.join(", ").toLowerCase()}.
                </p>
                <p>
                    On top of the conversion tools, the AI features are aimed at documents that are
                    too long to read end to end: summarising a report, or asking direct questions of
                    a contract instead of scrolling for the clause.
                </p>
            </Section>

            <Section heading="How your files are handled">
                <p>
                    Several tools — including image to PDF, PDF to image and Excel to PDF — run
                    entirely in your browser, so those files never leave your device. The remaining
                    tools process files on the server to complete the conversion.
                </p>
            </Section>

            <Section heading="Getting started">
                <p>
                    Every tool is available from the{" "}
                    <Link href="/tools" className="text-[var(--primary)] hover:underline">
                        tools page
                    </Link>
                    . Creating an account adds a document library — see{" "}
                    <Link href="/pricing" className="text-[var(--primary)] hover:underline">
                        pricing
                    </Link>{" "}
                    for what each plan includes.
                </p>
            </Section>
        </ContentPage>
    );
}
