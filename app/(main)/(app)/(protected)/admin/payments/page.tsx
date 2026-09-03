"use client"

import { useEffect, useState } from "react"

interface Payment {
    id: string
    reference: string
    email: string | null
    planId: string
    cycle: string
    amount: number
    status: string
    createdAt: number | null
    confirmedAt: number | null
    note: string | null
}

const TABS = [
    { key: "pending", label: "Waiting" },
    { key: "paid", label: "Confirmed" },
    { key: "rejected", label: "Rejected" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function when(ms: number | null): string {
    if (!ms) return "unknown date"
    return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export default function AdminPaymentsPage() {
    const [tab, setTab] = useState<TabKey>("pending")
    // Rows are stored with the tab they belong to, so "is this list current"
    // is derived rather than maintained. Clearing a separate list on tab change
    // meant setting state synchronously inside the effect, which cascades
    // renders — and left a window where one tab's rows showed under another's
    // heading.
    const [data, setData] = useState<{ tab: TabKey; rows: Payment[] } | null>(null)
    const payments = data && data.tab === tab ? data.rows : null
    const [denied, setDenied] = useState(false)
    const [busy, setBusy] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    // Which payment is mid-confirmation, and which is being rejected with a
    // note. Granting a plan cannot be undone from this screen, so it takes a
    // second deliberate click rather than one that can land by accident.
    const [confirming, setConfirming] = useState<string | null>(null)
    const [rejecting, setRejecting] = useState<string | null>(null)
    const [note, setNote] = useState("")

    useEffect(() => {
        // Switching tabs quickly can land responses out of order, and the later
        // arrival would win. This drops anything that comes back after the tab
        // has moved on.
        let cancelled = false

        void (async () => {
            try {
                // These pointed at /api/billing/payoneer/*, where nothing is
                // served. Every request got the 404 page, so the screen was inert.
                const res = await fetch(`/api/admin/payoneer/payments?status=${tab}`)
                if (cancelled) return

                if (res.status === 401 || res.status === 403) {
                    setDenied(true)
                    return
                }

                const body = await res.json()
                if (cancelled) return
                if (!res.ok) throw new Error(body.error)

                setError(null)
                setData({ tab, rows: body.payments })
            } catch (err) {
                if (cancelled) return
                setError(err instanceof Error ? err.message : "Could not load payments.")
                setData({ tab, rows: [] })
            }
        })()

        return () => {
            cancelled = true
        }
    }, [tab])

    async function act(paymentId: string, action: "confirm" | "reject") {
        setBusy(paymentId)
        setError(null)
        try {
            const res = await fetch("/api/admin/payoneer/confirm", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paymentId, action, note: action === "reject" ? note : undefined }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            // Dropped from the list rather than refetched: the row has left
            // this queue, and a refetch would blank the screen mid-review.
            setData((prev) => (prev ? { ...prev, rows: prev.rows.filter((p) => p.id !== paymentId) } : prev))
            setConfirming(null)
            setRejecting(null)
            setNote("")
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not update this payment.")
        } finally {
            setBusy(null)
        }
    }

    if (denied) {
        return (
            <div className="rounded-2xl border border-card bg-card p-5">
                <h1 className="text-xl text-fg">Admins only</h1>
                <p className="mt-1 text-sm text-muted">
                    This page needs the admin claim on your account. Grant it with{" "}
                    <code className="text-fg">node scripts/grant-admin.mjs your@email</code>, then sign out and back
                    in — the claim only reaches your session when it is issued.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl text-fg">Payments</h1>
                <p className="mt-1 text-sm text-muted">
                    Confirm a payment only once you have seen it in the Payoneer account. Nothing here checks that the
                    money arrived.
                </p>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`shrink-0 rounded-xl border px-3 py-1.5 text-sm transition ${
                            tab === t.key
                                ? "border-[var(--primary)] text-fg"
                                : "border-card text-muted hover:text-fg"
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}

            {payments === null && <div className="h-24 animate-pulse rounded-2xl bg-[var(--background-secondary)]" />}

            {payments?.length === 0 && (
                <p className="text-muted">
                    {tab === "pending" ? "No payments waiting. New ones appear here." : "Nothing here yet."}
                </p>
            )}

            {payments?.map((p) => (
                <div key={p.id} className="space-y-3 rounded-2xl border border-card bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                            <code className="text-fg">{p.reference}</code>
                            <p className="truncate text-sm text-muted">{p.email ?? "no email on file"}</p>
                            <p className="text-sm text-muted">
                                {p.planId} · {p.cycle} · ${p.amount.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted">
                                Started {when(p.createdAt)}
                                {p.confirmedAt ? ` · settled ${when(p.confirmedAt)}` : ""}
                            </p>
                            {p.note && <p className="mt-1 text-sm text-muted">Note: {p.note}</p>}
                        </div>

                        {tab === "pending" && !confirming && !rejecting && (
                            <div className="flex shrink-0 gap-2">
                                <button
                                    onClick={() => setConfirming(p.id)}
                                    className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm text-white transition hover:opacity-90"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => {
                                        setRejecting(p.id)
                                        setNote("")
                                    }}
                                    className="rounded-xl border border-card px-3 py-2 text-sm text-fg transition hover:bg-[var(--background-secondary)]"
                                >
                                    Reject
                                </button>
                            </div>
                        )}
                    </div>

                    {confirming === p.id && (
                        <div className="rounded-xl bg-[var(--background-secondary)] p-3">
                            <p className="text-sm text-fg">
                                Grant {p.planId} to {p.email ?? "this account"} for one {p.cycle === "yearly" ? "year" : "month"}?
                            </p>
                            <p className="mt-1 text-sm text-muted">This cannot be undone from here.</p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => act(p.id, "confirm")}
                                    disabled={busy === p.id}
                                    className="rounded-xl bg-[var(--primary)] px-3 py-2 text-sm text-white disabled:opacity-60"
                                >
                                    {busy === p.id ? "Granting..." : "Yes, grant it"}
                                </button>
                                <button
                                    onClick={() => setConfirming(null)}
                                    className="rounded-xl border border-card px-3 py-2 text-sm text-fg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {rejecting === p.id && (
                        <div className="rounded-xl bg-[var(--background-secondary)] p-3">
                            <label htmlFor={`note-${p.id}`} className="text-sm text-fg">
                                Why is this being rejected?
                            </label>
                            <p className="mb-2 text-sm text-muted">Kept on the payment so the decision has a reason attached.</p>
                            <input
                                id={`note-${p.id}`}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="No payment received"
                                className="w-full rounded-xl border border-card bg-card px-3 py-2 text-fg"
                            />
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => act(p.id, "reject")}
                                    disabled={busy === p.id}
                                    className="rounded-xl border border-card px-3 py-2 text-sm text-fg disabled:opacity-60"
                                >
                                    {busy === p.id ? "Rejecting..." : "Reject payment"}
                                </button>
                                <button
                                    onClick={() => setRejecting(null)}
                                    className="rounded-xl border border-card px-3 py-2 text-sm text-fg"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
