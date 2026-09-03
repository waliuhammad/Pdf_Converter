"use client"

import { useEffect, useState } from "react"

interface Settings {
    payUrl: string
    payeeName: string
    payeeEmail: string
    instructions: string
    enabled: boolean
    ready: boolean
    problem: string | null
    updatedAt: number | null
}

const FIELD =
    "w-full rounded-xl border border-card bg-[var(--background-secondary)] px-3 py-2 text-fg " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"

/**
 * Where the Payoneer account is configured.
 *
 * The payment link used to be an env var, so pointing the product at a real
 * account meant editing a file and redeploying. It is business data — the
 * person who owns billing should be able to set it, and fix a wrong link the
 * minute they notice, without waiting for a release.
 */
export default function PayoneerSettingsPage() {
    const [settings, setSettings] = useState<Settings | null>(null)
    const [denied, setDenied] = useState(false)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetch("/api/admin/payoneer/settings")
            .then(async (res) => {
                if (res.status === 401 || res.status === 403) {
                    setDenied(true)
                    return
                }
                const data = await res.json()
                if (data.settings) setSettings(data.settings)
                else setError(data.error ?? "Could not load these settings.")
            })
            .catch(() => setError("Could not load these settings."))
    }, [])

    async function save(event: React.FormEvent) {
        event.preventDefault()
        if (!settings) return

        setSaving(true)
        setError(null)
        setSaved(false)
        try {
            const res = await fetch("/api/admin/payoneer/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    payUrl: settings.payUrl,
                    payeeName: settings.payeeName,
                    payeeEmail: settings.payeeEmail,
                    instructions: settings.instructions,
                    enabled: settings.enabled,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            // Re-seeded from the response so the page shows what was stored,
            // including the recomputed ready/problem, rather than what was typed.
            setSettings(data.settings)
            setSaved(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save these settings.")
        } finally {
            setSaving(false)
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

    if (!settings) {
        return <div className="h-40 animate-pulse rounded-2xl bg-[var(--background-secondary)]" />
    }

    function update<K extends keyof Settings>(key: K, value: Settings[K]) {
        setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))
        setSaved(false)
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl text-fg">Payoneer settings</h1>
                <p className="mt-1 text-sm text-muted">
                    Customers see these details when they pay. Changes take effect within about a minute.
                </p>
            </div>

            <div
                className={`rounded-2xl border p-4 ${
                    settings.ready ? "border-card bg-card" : "border-[var(--destructive)] bg-card"
                }`}
            >
                <p className="text-fg">{settings.ready ? "Payments are live." : "Payments are not being taken."}</p>
                {settings.problem && <p className="mt-1 text-sm text-muted">{settings.problem}</p>}
                {settings.ready && (
                    <p className="mt-1 text-sm text-muted">
                        Customers can start a payment and will be sent to the link below.
                    </p>
                )}
            </div>

            <form onSubmit={save} className="space-y-4 rounded-2xl border border-card bg-card p-5">
                <div>
                    <label htmlFor="payUrl" className="text-sm text-fg">
                        Payment link
                    </label>
                    <p className="mb-2 text-sm text-muted">
                        The Payoneer payment-request link customers open. Paste the whole https:// link.
                    </p>
                    <input
                        id="payUrl"
                        type="url"
                        inputMode="url"
                        value={settings.payUrl}
                        onChange={(e) => update("payUrl", e.target.value)}
                        placeholder="https://payoneer.com/..."
                        className={FIELD}
                    />
                </div>

                <div>
                    <label htmlFor="payeeName" className="text-sm text-fg">
                        Account name
                    </label>
                    <p className="mb-2 text-sm text-muted">
                        Shown so customers can check who they are paying before they send money.
                    </p>
                    <input
                        id="payeeName"
                        value={settings.payeeName}
                        onChange={(e) => update("payeeName", e.target.value)}
                        className={FIELD}
                    />
                </div>

                <div>
                    <label htmlFor="payeeEmail" className="text-sm text-fg">
                        Account email
                    </label>
                    <p className="mb-2 text-sm text-muted">For customers who pay by transfer rather than the link.</p>
                    <input
                        id="payeeEmail"
                        type="email"
                        value={settings.payeeEmail}
                        onChange={(e) => update("payeeEmail", e.target.value)}
                        className={FIELD}
                    />
                </div>

                <div>
                    <label htmlFor="instructions" className="text-sm text-fg">
                        Payment instructions
                    </label>
                    <p className="mb-2 text-sm text-muted">Shown above the reference code at checkout.</p>
                    <textarea
                        id="instructions"
                        rows={4}
                        value={settings.instructions}
                        onChange={(e) => update("instructions", e.target.value)}
                        className={FIELD}
                    />
                </div>

                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => update("enabled", e.target.checked)}
                        className="mt-1"
                    />
                    <span>
                        <span className="text-fg">Accept payments</span>
                        <span className="block text-sm text-muted">
                            Turn this off to stop taking payments without clearing the account details.
                        </span>
                    </span>
                </label>

                {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
                {saved && <p className="text-sm text-muted">Saved.</p>}

                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-white transition hover:opacity-90 disabled:opacity-60 focus-visible:outline focus-visible:outline-2"
                >
                    {saving ? "Saving..." : "Save settings"}
                </button>
            </form>
        </div>
    )
}
