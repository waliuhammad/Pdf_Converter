import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Grammar Checker",
    description: "Check grammar and spelling of your documents. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/grammar" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
