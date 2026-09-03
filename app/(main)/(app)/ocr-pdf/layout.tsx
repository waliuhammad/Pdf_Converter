import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "OCR PDF",
    description: "Extract text from scanned PDFs. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/ocr-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
