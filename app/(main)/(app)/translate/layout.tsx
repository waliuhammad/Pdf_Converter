import type { Metadata } from "next";
import { ToolGuide } from "@/components/tools/tool-guide";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Translate PDF",
    description: "Translate your documents. Part of PDFAI, free with an account.",
    alternates: { canonical: "/translate" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <ToolGuide href="/translate" />
        </>
    );
}
