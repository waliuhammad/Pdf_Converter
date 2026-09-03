import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "Watermark PDF",
    description: "Add text or image watermarks. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/watermark-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
