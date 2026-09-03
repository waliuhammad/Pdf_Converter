import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Compress PDF",
    description: "Reduce PDF file size quickly. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/compress-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
