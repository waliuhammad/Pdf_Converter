import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Choose a new password",
    description: "Set a new password for your PDFAI account.",
    // Nothing here is useful in search results.
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
