"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { resolvePlan } from "@/lib/firebase/users";
import { getPlan } from "@/lib/plans";

/**
 * The Subscription & Billing panel in settings.
 *
 * Free users get a link to /pricing — upgrading starts there, where the
 * plans are actually explained. Paying users get "Manage subscription",
 * which asks the server for a portal URL: cancelling, changing card and
 * invoices all live on the payment provider's hosted portal, not here.
 *
 * The portal endpoint does not exist yet, so a failed call says exactly
 * that — the same honesty as the checkout button and the contact form.
 */
export function BillingTab() {
    const { profile, loading } = useAuth();
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const planId = resolvePlan(profile);
    const plan = getPlan(planId);
    const isFree = planId === "free";

    const openPortal = async () => {
        setOpening(true);
        setError(null);

        try {
            const res = await fetch("/api/billing/portal", { method: "POST" });
            const data = await res.json().catch(() => null);

            if (res.ok && data?.url) {
                window.location.assign(data.url);
                return;
            }

            setError(
                data?.message ??
                "Subscription management isn't connected yet. This button is ready for the backend."
            );
        } catch {
            setError("Could not reach the server. Please try again.");
        }

        setOpening(false);
    };

    if (loading) {
        return (
            <div className="max-w-md flex items-center gap-2 text-sm text-muted">
                <Loader2 size={15} className="animate-spin" /> Loading your plan…
            </div>
        );
    }

    return (
        <div className="max-w-md">
            <h2 className="text-lg font-semibold text-fg mb-4">
                Subscription &amp; Billing
            </h2>

            {/* Current plan */}
            <div className="p-5 rounded-xl border border-card mb-4">
                <p className="text-sm text-muted">Current plan</p>

                <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-lg font-semibold text-fg">{plan.name}</p>
                    <p className="text-sm text-muted">
                        {isFree ? "" : `${plan.monthly}/month`}
                    </p>
                </div>

                <ul className="mt-4 space-y-2.5">
                    {plan.features.map((feature) => (
                        <li
                            key={feature}
                            className="flex gap-2.5 text-xs md:text-sm text-muted"
                        >
                            <Check size={15} className="text-primary shrink-0" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </div>

            {error && (
                <p className="mb-3 flex items-start gap-1.5 text-sm text-red-600">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    {error}
                </p>
            )}

            {isFree ? (
                <Link
                    href="/pricing"
                    className="inline-block px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                    Upgrade Plan
                </Link>
            ) : (
                <button
                    onClick={openPortal}
                    disabled={opening}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60"
                >
                    {opening && <Loader2 size={15} className="animate-spin" />}
                    Manage subscription
                </button>
            )}
        </div>
    );
}