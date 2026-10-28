import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Word to PDF",
    description: "Convert Word documents into PDF. Part of PDFAI, free with an account.",
    alternates: { canonical: "/word-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/word-to-pdf" />
        </>
    );
}
