"use client";

/**
 * Last resort: the root layout itself failed, so app/error.tsx never rendered.
 * This replaces the whole document and cannot rely on any of the app's styling.
 */
export default function GlobalError({
    error,
    unstable_retry,
}: {
    error: Error & { digest?: string };
    unstable_retry: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    minHeight: "100vh",
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "1rem",
                    padding: "1.5rem",
                    textAlign: "center",
                    fontFamily:
                        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    background: "#ffffff",
                    color: "#0f172a",
                }}
            >
                <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
                    PDFAI could not load
                </h1>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.875rem" }}>
                    Something failed before the page could start.
                </p>
                {error.digest && (
                    <p
                        style={{
                            margin: 0,
                            color: "#94a3b8",
                            fontSize: "0.75rem",
                            fontFamily: "ui-monospace, monospace",
                        }}
                    >
                        Reference: {error.digest}
                    </p>
                )}
                <button
                    onClick={() => unstable_retry()}
                    style={{
                        marginTop: "0.5rem",
                        padding: "0.625rem 1.25rem",
                        borderRadius: "0.75rem",
                        border: "none",
                        background: "#0f172a",
                        color: "#ffffff",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Try again
                </button>
            </body>
        </html>
    );
}
