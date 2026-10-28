import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Image to PDF",
    description: "Convert images into a PDF file. Part of PDFAI, free with an account.",
    alternates: { canonical: "/image-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/image-to-pdf" />
        </>
    );
}
