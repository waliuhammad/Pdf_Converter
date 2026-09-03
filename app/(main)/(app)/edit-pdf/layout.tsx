import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Edit PDF",
    description: "Edit text and images inside PDFs. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/edit-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
