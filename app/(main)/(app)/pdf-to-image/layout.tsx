import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PDF to Image",
    description: "Convert PDF pages into images. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/pdf-to-image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
