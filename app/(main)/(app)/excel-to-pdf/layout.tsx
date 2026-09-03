import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Excel to PDF",
    description: "Convert spreadsheets into PDFs. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/excel-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
