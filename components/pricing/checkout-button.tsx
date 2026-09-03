import Link from "next/link"
import type { PlanId, BillingCycle } from "@/lib/plans"

interface Props {
    planId: PlanId
    cycle: BillingCycle
    label?: string
}

/**
 * Sends the visitor to checkout with the plan they picked.
 *
 * This used to swap itself for the payment form in place, inside the pricing
 * card. That put an amount, a reference code and a payment link into a column
 * sized for a feature list, and losing the page — a refresh, a back button, a
 * tab restored the next morning — lost the state with it. A checkout URL can be
 * returned to, and the plan and cycle travel in the link rather than in memory.
 */
export function CheckoutButton({ planId, cycle, label = "Get started" }: Props) {
    if (planId === "free") {
        return (
            // /signup does not exist; the sign-up route is /register, so this
            // sent everyone choosing the free plan to the 404 page.
            <Link
                href="/register"
                className="block w-full rounded-xl border border-card px-4 py-3 text-center text-fg transition hover:bg-[var(--background-secondary)]"
            >
                {label}
            </Link>
        )
    }

    return (
        <Link
            href={`/checkout?plan=${planId}&cycle=${cycle}`}
            className="block w-full rounded-xl bg-[var(--primary)] px-4 py-3 text-center text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2"
        >
            {label}
        </Link>
    )
}
