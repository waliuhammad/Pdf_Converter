import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PDF to Excel",
    description: "Convert PDF tables into spreadsheets. Part of PDFAI, free with an account.",
    alternates: { canonical: "/pdf-to-excel" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/pdf-to-excel" />
        </>
    );
}
