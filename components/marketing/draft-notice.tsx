import { AlertTriangle } from "lucide-react";

/**
 * Marks a legal page as an unreviewed skeleton. The structure below is the set
 * of sections such a document normally covers — the wording still has to be
 * written and reviewed by a qualified person before this page is published.
 */
export function DraftNotice() {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
                <p className="font-semibold text-fg">Draft — not legal advice</p>
                <p className="text-muted mt-1 leading-6">
                    This page is a structural placeholder. The sections below list what such a
                    document normally covers, but the wording has not been written or reviewed.
                    Replace it with copy from a qualified adviser before launch.
                </p>
            </div>
        </div>
    );
}

export function Placeholder({ children }: { children: React.ReactNode }) {
    return <p className="italic text-muted/80">{children}</p>;
}
