"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { downloadAsPdf, downloadAsTxt, type TextExport } from "@/lib/text-export";

/** "Download TXT" / "Download PDF" under an AI result (summary, OCR text). */
export function ExportButtons({ data }: { data: TextExport }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const savePdf = async () => {
        setSaving(true);
        setError(null);
        try {
            await downloadAsPdf(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the PDF. Try the TXT download instead.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-5 pt-4 border-t border-border space-y-2">
            <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                    type="button"
                    onClick={() => downloadAsTxt(data)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-card border border-border hover:bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                    <Download size={15} />
                    Download TXT
                </button>
                <button
                    type="button"
                    onClick={savePdf}
                    disabled={saving}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                >
                    <Download size={15} />
                    {saving ? "Creating PDF..." : "Download PDF"}
                </button>
            </div>
            {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
}
