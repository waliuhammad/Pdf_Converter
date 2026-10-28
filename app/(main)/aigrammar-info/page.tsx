import type { Metadata } from "next";
import { AiInfoPage } from "@/components/marketing/ai-info-page";

export const metadata: Metadata = {
    title: "Grammar Checker",
    description: "Check the grammar, spelling and punctuation of English PDF documents with AI.",
    alternates: { canonical: "/aigrammar-info" },
};

export default function GrammarInfoPage() {
    return (
        <AiInfoPage
            title="Grammar Checker"
            intro="Find and fix grammar, spelling and punctuation mistakes in an English PDF."
            href="/grammar"
            toolLabel="Grammar Checker"
        >
            <p>The grammar checker reads the text of your PDF and returns a corrected version, fixing grammar, spelling, punctuation and capitalisation.</p>
            <p>It deliberately leaves your wording and style alone — it corrects mistakes rather than rewriting sentences — and shows every change word by word, so you can see exactly what it altered before you use the text.</p>
        </AiInfoPage>
    );
}
