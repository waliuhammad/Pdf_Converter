import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Split PDF",
    description: "Extract pages from any PDF. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/split-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
