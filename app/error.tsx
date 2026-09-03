"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-5">
                <AlertTriangle className="w-7 h-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-fg mb-2">
                Something went wrong
            </h1>
            <p className="text-sm text-muted max-w-md mb-2">
                This page hit an error. Your files were not uploaded anywhere and nothing
                was saved.
            </p>
            {error.digest && (
                <p className="text-xs text-muted font-mono mb-6">
                    Reference: {error.digest}
                </p>
            )}

            <div className="flex items-center gap-3 mt-4">
                <button
                    onClick={() => unstable_retry()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
                >
                    <RotateCw className="w-4 h-4" />
                    Try again
                </button>
                <Link
                    href="/tools"
                    className="px-5 py-2.5 rounded-xl border border-card text-fg font-medium text-sm hover:bg-[var(--background-secondary)] transition-colors"
                >
                    Back to tools
                </Link>
            </div>
        </div>
    );
}
