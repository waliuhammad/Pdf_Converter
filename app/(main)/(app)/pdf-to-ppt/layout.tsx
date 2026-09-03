import type { Metadata } from "next";

// The page itself is a client component and so cannot export metadata.
export const metadata: Metadata = {
    title: "PDF to PPT",
    description: "Convert PDF into editable slides. Part of PDFAI, usable without an account.",
    alternates: { canonical: "/pdf-to-ppt" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
