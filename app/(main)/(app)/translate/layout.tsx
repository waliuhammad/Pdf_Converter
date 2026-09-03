import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Translate PDF",
    description: "Translate your documents. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/translate" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
