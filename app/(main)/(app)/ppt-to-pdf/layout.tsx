import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PPT to PDF",
    description: "Convert presentations into PDF. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/ppt-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
