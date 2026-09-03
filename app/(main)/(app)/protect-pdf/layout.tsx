import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Protect PDF",
    description: "Encrypt PDF files with passwords. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/protect-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
