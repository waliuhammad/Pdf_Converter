import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Sign PDF",
    description: "Add a typed or drawn signature to a PDF. Part of PDFAI, free with an account.",
    alternates: { canonical: "/sign-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/sign-pdf" />
        </>
    );
}
