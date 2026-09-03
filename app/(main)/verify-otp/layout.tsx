import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Verify your email",
    description: "Confirm the code sent to your email address.",
    // Nothing here is useful in search results.
    robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
