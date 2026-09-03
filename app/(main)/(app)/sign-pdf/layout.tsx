import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Sign PDF",
    description: "Add digital signatures instantly. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/sign-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
