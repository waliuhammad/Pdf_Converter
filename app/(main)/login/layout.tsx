import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Log in",
    description: "Sign in to your PDFAI account.",
    // Nothing here is useful in search results.
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
