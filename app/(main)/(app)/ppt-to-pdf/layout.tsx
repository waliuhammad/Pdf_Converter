import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PPT to PDF",
    description: "Convert presentations into PDF. Part of PDFAI, free with an account.",
    alternates: { canonical: "/ppt-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/ppt-to-pdf" />
        </>
    );
}
