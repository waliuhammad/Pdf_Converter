import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Rotate PDF",
    description: "Rotate pages to the correct orientation. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/rotate-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
