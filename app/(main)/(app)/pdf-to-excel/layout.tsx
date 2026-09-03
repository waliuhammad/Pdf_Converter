import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PDF to Excel",
    description: "Convert PDF tables into spreadsheets. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/pdf-to-excel" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
