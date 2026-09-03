"use client";

import Link from "next/link";
import { Cpu } from "lucide-react";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useT } from "@/components/locale-provider";

/**
 * "X of Y tool operations used today", read from /api/usage.
 *
 * It says tools rather than AI because the same daily allowance is spent by
 * every metered route — the conversions and the PDF utilities as well as the
 * AI features — so naming only the AI ones understated what the bar measures.
 *
 * The fetch lives in usePlanUsage so this and the dashboard storage tile
 * answer from one request and cannot disagree about the current plan.
 */
export function UsageMeter({
    /** Drop the card chrome and the header row — the caller supplies its own. */
    hideHeader = false,
    /** Drop just the heading, keeping the plan label. */
    hideTitle = false,
}: {
    hideHeader?: boolean;
    hideTitle?: boolean;
} = {}) {
    const { usage, unavailable } = usePlanUsage();
    const { t } = useT();
    const shell = hideHeader ? "" : "bg-card border border-card rounded-2xl p-4 sm:p-6";

    // Nothing to show only once asking has actually failed — signed out, or the
    // endpoint is unreachable. A meter that cannot be filled in honestly is
    // still better absent than wrong.
    if (!usage && unavailable) return null;

    // First load: same footprint as the real card, so the dashboard does not
    // reflow when the numbers arrive. A refetch (plan switch, window focus)
    // keeps the old numbers on screen rather than flashing back to this.
    if (!usage) {
        return (
            <div className={shell}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="h-5 w-40 rounded bg-[var(--background-secondary)] animate-pulse" />
                    <div className="h-3 w-16 rounded bg-[var(--background-secondary)] animate-pulse" />
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--background-secondary)] animate-pulse mb-2" />
                <div className="h-4 w-48 rounded bg-[var(--background-secondary)] animate-pulse" />
            </div>
        );
    }

    const exhausted = usage.used >= usage.limit;

    // The counter is per user per day, not per plan, so it survives a change of
    // plan while the limit does not. Twelve operations spent on Pro's allowance
    // and then read against Free's five reported "12 of 5", which describes
    // nothing the visitor can act on. The spend cannot exceed the allowance it
    // was checked against, so the figure is shown capped.
    const shown = Math.min(usage.used, usage.limit);
    const percent = usage.limit > 0 ? Math.min((usage.used / usage.limit) * 100, 100) : 100;

    return (
        // hideHeader means the caller already drew the card, so drawing another
        // here would nest one panel inside an identical one.
        <div className={shell}>
            {!hideHeader && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    {!hideTitle && (
                        <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
                            <Cpu size={17} className="text-[var(--primary)]" />
                            {t("usage.title")}
                        </h2>
                    )}
                    <span className="text-xs text-muted capitalize">{t("usage.plan", { plan: usage.plan })}</span>
                </div>
            )}

            {/* Without the header row the plan would go unstated, and which plan
                the numbers belong to is the point of the card. */}
            {hideHeader && (
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    {!hideTitle && (
                        <span className="text-sm font-semibold text-fg">{t("usage.title")}</span>
                    )}
                    <span className="text-xs text-muted capitalize">{t("usage.plan", { plan: usage.plan })}</span>
                </div>
            )}

            <div className="w-full h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden mb-2">
                <div
                    className={`h-full rounded-full transition-all ${exhausted ? "bg-red-500" : "bg-[var(--primary)]"}`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            {exhausted ? (
                <p className="text-sm font-medium text-red-500">
                    {t("usage.limitReached", { used: shown, limit: usage.limit })}
                </p>
            ) : (
                <p className="text-sm text-muted">
                    {t("usage.used", { used: shown, limit: usage.limit })}
                </p>
            )}

            {exhausted && (
                <Link
                    href="/pricing"
                    className="mt-3 inline-block text-sm font-medium text-[var(--primary)] hover:underline"
                >
                    {t("usage.upgrade")}
                </Link>
            )}
        </div>
    );
}
