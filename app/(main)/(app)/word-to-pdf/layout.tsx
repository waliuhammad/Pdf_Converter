import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Word to PDF",
    description: "Convert Word documents into PDF. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/word-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
