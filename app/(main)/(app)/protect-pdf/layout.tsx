import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Protect PDF",
    description: "Encrypt PDF files with passwords. Part of PDFAI, free with an account.",
    alternates: { canonical: "/protect-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/protect-pdf" />
        </>
    );
}
