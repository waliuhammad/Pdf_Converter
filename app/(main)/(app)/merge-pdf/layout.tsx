import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one. Part of PDFAI, free with an account.",
    alternates: { canonical: "/merge-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/merge-pdf" />
        </>
    );
}
