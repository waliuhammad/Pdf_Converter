import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PDF to Word",
    description: "Convert PDF into editable Word files. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/pdf-to-word" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
