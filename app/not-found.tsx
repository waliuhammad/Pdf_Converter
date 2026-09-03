import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Page not found",
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
            <p className="text-5xl font-bold tracking-tight text-fg mb-3">404</p>
            <h1 className="text-xl font-semibold text-fg mb-2">
                We could not find that page
            </h1>
            <p className="text-sm text-muted max-w-md mb-6">
                The link may be out of date, or the tool may have moved.
            </p>
            <Link
                href="/tools"
                className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
            >
                Browse all tools
            </Link>
        </div>
    );
}
