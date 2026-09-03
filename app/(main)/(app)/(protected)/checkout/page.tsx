"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Check, Copy, ExternalLink, Loader2, ShieldCheck } from "lucide-react"
import { getPlan, PLANS, type BillingCycle, type PlanId } from "@/lib/plans"
import { usePlanUsageContext } from "@/components/plan-usage-provider"

interface Payment {
    id: string
    reference: string
    amount: number
    planId: PlanId
    cycle: BillingCycle
    status: "pending" | "paid" | "rejected" | "expired"
    note: string | null
    createdAt: number | null
}

interface Status {
    available: boolean
    plan: PlanId
    planExpiresAt: number | null
    payment: Payment | null
    payee: { payUrl: string; payeeName: string; payeeEmail: string; instructions: string } | null
}

/** How often to ask whether the payment has been confirmed. */
const POLL_MS = 4000

function isPlanId(value: string | null): value is PlanId {
    return value === "free" || value === "pro" || value === "business"
}

function priceFor(planId: PlanId, cycle: BillingCycle): number {
    const plan = getPlan(planId)
    // Each field is the amount for its own cycle. Must stay in step with
    // priceFor in lib/billing/payoneer.ts, which is what the invoice uses —
    // if these disagree, the page quotes one price and charges another.
    return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
}

const CARD = "rounded-2xl border border-card bg-card"

export default function CheckoutPage() {
    // useSearchParams needs a Suspense boundary above it, or the whole route
    // opts out of static rendering with a build-time warning.
    return (
        <Suspense fallback={<div className="mx-auto h-64 w-full max-w-3xl animate-pulse rounded-2xl bg-[var(--background-secondary)]" />}>
            <Checkout />
        </Suspense>
    )
}

function Checkout() {
    const params = useSearchParams()
    const router = useRouter()
    const planUsage = usePlanUsageContext()

    const requested: PlanId = isPlanId(params.get("plan")) ? (params.get("plan") as PlanId) : "pro"
    const cycle: BillingCycle = params.get("cycle") === "yearly" ? "yearly" : "monthly"
    const amount = priceFor(requested, cycle)

    const [status, setStatus] = useState<Status | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [starting, setStarting] = useState(false)
    const [copied, setCopied] = useState(false)
    // Remembers the plan the page arrived with, so the "your plan is active"
    // switch fires on the change rather than on merely already owning it.
    const settledRef = useRef(false)

    const read = useCallback(async (signal?: AbortSignal) => {
        try {
            const res = await fetch("/api/billing/checkout/payoneer/status", { signal, cache: "no-store" })
            if (res.status === 401) {
                router.push(`/login?next=${encodeURIComponent(`/checkout?plan=${requested}&cycle=${cycle}`)}`)
                return null
            }
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setStatus(data)
            setError(null)
            return data as Status
        } catch (err) {
            if ((err as Error)?.name === "AbortError") return null
            setError(err instanceof Error ? err.message : "Could not check your payment.")
            return null
        }
    }, [router, requested, cycle])

    // First read, on arrival.
    useEffect(() => {
        const controller = new AbortController()
        // set-state-in-effect guards against a synchronous setState cascading
        // renders. read() sets nothing until its fetch resolves, so there is no
        // cascade here — but the rule cannot see past the useCallback to know it.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void read(controller.signal)
        return () => controller.abort()
    }, [read])

    const paymentStatus = status?.payment?.status

    /**
     * Watch while a payment is outstanding.
     *
     * Keyed on the payment's status rather than chained inside the first read:
     * on arrival there is usually no invoice yet, so a self-scheduling loop
     * stopped immediately and never restarted when one was created a moment
     * later — leaving the page saying "waiting" forever, including after the
     * payment had actually been confirmed.
     */
    useEffect(() => {
        if (paymentStatus !== "pending") return

        const controller = new AbortController()
        const timer = setInterval(() => void read(controller.signal), POLL_MS)

        return () => {
            controller.abort()
            clearInterval(timer)
        }
    }, [paymentStatus, read])

    // The plan just changed, so anything showing it — the usage meter, the tool
    // limits, server-rendered pages — is now stale.
    useEffect(() => {
        if (paymentStatus !== "paid" || settledRef.current) return
        settledRef.current = true
        planUsage?.refresh()
        router.refresh()
    }, [paymentStatus, planUsage, router])

    async function start() {
        setStarting(true)
        setError(null)
        try {
            const res = await fetch("/api/billing/checkout/payoneer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: requested, cycle }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            await read()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not start this payment.")
        } finally {
            setStarting(false)
        }
    }

    function copyReference(reference: string) {
        navigator.clipboard.writeText(reference)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (requested === "free") {
        return (
            <Shell>
                <div className={`${CARD} p-6`}>
                    <h1 className="text-xl text-fg">The Free plan needs no payment</h1>
                    <p className="mt-1 text-sm text-muted">You already have it. Pick Pro or Business to upgrade.</p>
                    <Link href="/pricing" className="mt-4 inline-block rounded-xl bg-[var(--primary)] px-4 py-2.5 text-white">
                        See plans
                    </Link>
                </div>
            </Shell>
        )
    }

    if (!status) {
        return (
            <Shell>
                <div className="h-64 animate-pulse rounded-2xl bg-[var(--background-secondary)]" />
            </Shell>
        )
    }

    const payment = status.payment
    const active = payment?.status === "paid"

    return (
        <Shell>
            <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
                <div className="space-y-5">
                    {active && payment ? (
                        <Confirmed planId={payment.planId} expiresAt={status.planExpiresAt} />
                    ) : payment?.status === "pending" ? (
                        <Waiting
                            payment={payment}
                            payee={status.payee}
                            copied={copied}
                            onCopy={() => copyReference(payment.reference)}
                        />
                    ) : !status.available ? (
                        <Unavailable />
                    ) : (
                        <Start
                            planId={requested}
                            cycle={cycle}
                            rejected={payment?.status === "rejected" ? payment : null}
                            starting={starting}
                            onStart={start}
                        />
                    )}

                    {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
                </div>

                <OrderSummary planId={requested} cycle={cycle} amount={payment?.amount ?? amount} currentPlan={status.plan} />
            </div>
        </Shell>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
            <div className="mb-5">
                <h1 className="text-2xl text-fg sm:text-3xl">Checkout</h1>
                <p className="mt-1 text-sm text-muted">
                    <Link href="/pricing" className="underline underline-offset-4 hover:text-fg">
                        Back to plans
                    </Link>
                </p>
            </div>
            {children}
        </div>
    )
}

function Start({
    planId,
    cycle,
    rejected,
    starting,
    onStart,
}: {
    planId: PlanId
    cycle: BillingCycle
    rejected: Payment | null
    starting: boolean
    onStart: () => void
}) {
    const plan = getPlan(planId)
    return (
        <div className={`${CARD} p-5 sm:p-6`}>
            <h2 className="text-lg text-fg">Upgrade to {plan.name}</h2>
            <p className="mt-1 text-sm text-muted">
                We will give you a reference code and a payment link. Your plan activates once we confirm the payment,
                usually within one business day.
            </p>

            {rejected && (
                <div className="mt-4 rounded-xl border border-[var(--destructive)] p-3">
                    <p className="text-sm text-fg">Your last payment was not accepted.</p>
                    {rejected.note && <p className="mt-1 text-sm text-muted">{rejected.note}</p>}
                    <p className="mt-1 text-sm text-muted">You can start a new one below.</p>
                </div>
            )}

            <button
                onClick={onStart}
                disabled={starting}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 sm:w-auto"
            >
                {starting && <Loader2 size={16} className="animate-spin" />}
                {starting ? "Preparing your invoice..." : `Continue to payment (${cycle})`}
            </button>

            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
                <ShieldCheck size={15} className="shrink-0" />
                We never see or store your card details.
            </p>
        </div>
    )
}

function Waiting({
    payment,
    payee,
    copied,
    onCopy,
}: {
    payment: Payment
    payee: Status["payee"]
    copied: boolean
    onCopy: () => void
}) {
    return (
        <div className={`${CARD} space-y-5 p-5 sm:p-6`}>
            <div>
                <p className="text-sm text-muted">Amount due</p>
                <p className="text-3xl text-fg">${payment.amount.toFixed(2)} USD</p>
            </div>

            {payee?.instructions && <p className="text-sm text-muted">{payee.instructions}</p>}

            <div>
                <p className="text-sm text-muted">
                    Put this code in the payment note. Without it we cannot match your payment to your account.
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 truncate rounded-xl bg-[var(--background-secondary)] px-3 py-2.5 text-fg">
                        {payment.reference}
                    </code>
                    <button
                        onClick={onCopy}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-card px-3 py-2.5 text-sm text-fg transition hover:bg-[var(--background-secondary)] focus-visible:outline focus-visible:outline-2"
                    >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </div>

            {payee && (payee.payeeName || payee.payeeEmail) && (
                <div className="rounded-xl bg-[var(--background-secondary)] px-3 py-2.5">
                    <p className="text-sm text-muted">Paying</p>
                    {payee.payeeName && <p className="text-fg">{payee.payeeName}</p>}
                    {payee.payeeEmail && <p className="text-sm text-muted">{payee.payeeEmail}</p>}
                </div>
            )}

            {payee?.payUrl && (
                <a
                    href={payee.payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3 text-white transition hover:opacity-90"
                >
                    Open Payoneer to pay <ExternalLink size={15} />
                </a>
            )}

            <div className="flex items-start gap-2.5 rounded-xl border border-card p-3">
                <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-muted" />
                <div>
                    <p className="text-sm text-fg">Waiting for us to confirm your payment</p>
                    <p className="text-sm text-muted">
                        This page updates on its own — you can leave it open, or come back to it later.
                    </p>
                </div>
            </div>
        </div>
    )
}

function Confirmed({ planId, expiresAt }: { planId: PlanId; expiresAt: number | null }) {
    const plan = getPlan(planId)
    return (
        <div className={`${CARD} p-5 sm:p-6`}>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-white">
                <Check size={22} />
            </div>
            <h2 className="text-xl text-fg">{plan.name} is active</h2>
            <p className="mt-1 text-sm text-muted">
                Your payment is confirmed and every {plan.name} feature is unlocked.
                {expiresAt ? ` Your plan runs until ${new Date(expiresAt).toLocaleDateString(undefined, { dateStyle: "long" })}.` : ""}
            </p>
            <p className="mt-1 text-sm text-muted">This was a one-time payment — it will not renew on its own.</p>

            <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/dashboard" className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-white transition hover:opacity-90">
                    Go to dashboard
                </Link>
                <Link href="/tools" className="rounded-xl border border-card px-4 py-2.5 text-fg transition hover:bg-[var(--background-secondary)]">
                    Start using the tools
                </Link>
            </div>
        </div>
    )
}

function Unavailable() {
    return (
        <div className={`${CARD} p-5 sm:p-6`}>
            <h2 className="text-lg text-fg">Payments are not available yet</h2>
            <p className="mt-1 text-sm text-muted">
                We are finishing setup. Please check back shortly, or contact us and we will arrange payment with you
                directly.
            </p>
            <Link
                href="/contact"
                className="mt-4 inline-block rounded-xl border border-card px-4 py-2.5 text-fg transition hover:bg-[var(--background-secondary)]"
            >
                Contact us
            </Link>
        </div>
    )
}

function OrderSummary({
    planId,
    cycle,
    amount,
    currentPlan,
}: {
    planId: PlanId
    cycle: BillingCycle
    amount: number
    currentPlan: PlanId
}) {
    const plan = getPlan(planId)
    const alternative = PLANS.find((p) => p.id !== planId && p.id !== "free" && p.id !== currentPlan)

    return (
        <div className={`${CARD} p-5 sm:p-6`}>
            <h2 className="text-lg text-fg">{plan.name}</h2>
            <p className="mt-0.5 text-sm text-muted">{plan.description}</p>

            <div className="mt-4 flex items-baseline justify-between border-b border-card pb-4">
                <span className="text-sm text-muted">{cycle === "yearly" ? "One year" : "One month"}</span>
                <span className="text-2xl text-fg">${amount.toFixed(2)}</span>
            </div>

            <ul className="mt-4 space-y-2.5">
                {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-sm text-muted">
                        <Check size={16} className="mt-0.5 shrink-0 text-[var(--primary)]" />
                        {feature}
                    </li>
                ))}
            </ul>

            <p className="mt-4 text-sm text-muted">
                You are on the {getPlan(currentPlan).name} plan.
                {alternative && (
                    <>
                        {" "}
                        <Link
                            href={`/checkout?plan=${alternative.id}&cycle=${cycle}`}
                            className="underline underline-offset-4 hover:text-fg"
                        >
                            Compare {alternative.name}
                        </Link>
                    </>
                )}
            </p>
        </div>
    )
}
