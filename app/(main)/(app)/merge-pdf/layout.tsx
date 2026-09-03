import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/merge-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
