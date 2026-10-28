import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Edit PDF",
    description: "Add text, replace text or draw on a PDF. Part of PDFAI, free with an account.",
    alternates: { canonical: "/edit-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/edit-pdf" />
        </>
    );
}
