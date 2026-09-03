import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "AI Summary",
    description: "Generate document summaries instantly. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/summarize-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
