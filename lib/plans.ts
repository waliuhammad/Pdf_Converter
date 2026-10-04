/**
 * The single source of truth for plans.
 *
 * Pricing cards, the billing tab in settings, plan gating and the checkout
 * endpoint all read from here. Prices are display strings, not numbers,
 * because the real charge amounts live with the payment provider — the
 * website only ever shows them.
 *
 * The yearly column shows the per-month equivalent of the yearly charge, so
 * the two columns compare like for like: Pro bills $119.88/year, shown as
 * $9.99/month.
 */

export type PlanId = "free" | "pro" | "business";
export type BillingCycle = "monthly" | "yearly";

export interface Plan {
    id: PlanId;
    name: string;
    monthly: string;
    yearly: string;
    /**
     * The same amounts as numbers, for anything that has to charge rather than
     * display. Billing must not parse "$12.99" back into a number: a display
     * string that gains a currency symbol, a comma or a locale format silently
     * becomes NaN, and NaN is an invoice for nothing.
     *
     * monthlyPrice is one month. yearlyPrice is the whole year, not a twelfth
     * of it: it used to hold the per-month equivalent and every caller
     * multiplied by twelve, which meant the number in this file was not the
     * number anyone was charged, and a plain edit to it — setting it to the
     * yearly figure — would have billed twelve years. Both fields now mean
     * exactly what a customer pays for that cycle.
     */
    monthlyPrice: number;
    yearlyPrice: number;
    description: string;
    popular?: boolean;
    features: string[];
}

export const PLANS: Plan[] = [
    {
        id: "free",
        name: "Free",
        monthly: "$0",
        yearly: "$0",
        monthlyPrice: 0,
        yearlyPrice: 0,
        description: "Get started with everyday PDF tasks at no cost.",
        features: [
            "Up to 10 tasks every day",
            "Essential PDF tools included",
            "1 OCR scan daily",
            "1 AI document summary daily",
            "Smooth, quick processing",
            "Help through community forums",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        monthly: "$12.99",
        // Per-month equivalent of the $119.88 yearly charge.
        yearly: "$9.99",
        monthlyPrice: 12.99,
        yearlyPrice: 119.88,
        description: "More power and higher limits for individual professionals.",
        popular: true,
        features: [
            "Up to 50 tasks every day",
            "30 advanced PDF tasks daily",
            "5 OCR scans daily",
            "5 AI document summaries daily",
            "5 AI writing & grammar checks daily",
            "5 AI translations daily",
            "Quicker turnaround on every task",
            "No ads, no distractions",
            "Priority help from our support team",
        ],
    },
    {
        id: "business",
        name: "Business",
        monthly: "$38.99",
        // Per-month equivalent of the $371.88 yearly charge.
        yearly: "$30.99",
        monthlyPrice: 38.99,
        yearlyPrice: 371.88,
        description: "Built for teams that handle documents together.",
        features: [
            "Up to 100 tasks every day",
            "60 advanced PDF tasks daily",
            "10 OCR scans daily",
            "10 AI document summaries daily",
            "10 AI writing & grammar checks daily",
            "10 AI translations daily",
            "Share and work on files as a team",
            "Add up to 5 team members",
            "Your tasks go to the front of the queue",
            "Enhanced protection for your files",
            "No ads, no distractions",
            "Priority help from our support team",
        ],
    },
];

export function getPlan(id: PlanId): Plan {
    // PLANS covers every PlanId, so the fallback only guards bad data
    // arriving from outside (e.g. an old stored profile).
    return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/**
 * Plan hierarchy. A feature requiring "pro" is open to anyone whose rank
 * is at least pro's — so Business users are never locked out of Pro
 * features just because the strings differ.
 */
const PLAN_RANK: Record<PlanId, number> = {
    free: 0,
    pro: 1,
    business: 2,
};

export function planSatisfies(current: PlanId, required: PlanId): boolean {
    return PLAN_RANK[current] >= PLAN_RANK[required];
}