import { NextResponse } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin"
import { requireAdmin } from "@/lib/firebase/require-admin"
import type { PaymentStatus } from "@/lib/billing/payoneer"

export const runtime = "nodejs"

const STATUSES: PaymentStatus[] = ["pending", "paid", "rejected", "expired"]

interface Row {
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

/**
 * Payments for the admin review screen.
 *
 * `?status=` filters; the default is the pending queue, which is the only list
 * with work in it. Confirmed and rejected are readable too, because the first
 * question after "did that go through" is usually "what did I do last week".
 */
export async function GET(req: Request) {
    const check = await requireAdmin()
    if (!check.ok) return check.response

    const requested = new URL(req.url).searchParams.get("status") ?? "pending"
    const status = STATUSES.includes(requested as PaymentStatus) ? (requested as PaymentStatus) : "pending"

    const snap = await getAdminDb().ref("payments").orderByChild("status").equalTo(status).get()
    const records = Object.entries((snap.val() ?? {}) as Record<string, Record<string, unknown>>)

    const rows: Row[] = records.map(([id, data]) => ({
        id,
        reference: (data.reference as string) ?? "",
        email: (data.email as string | null) ?? null,
        planId: (data.planId as string) ?? "",
        cycle: (data.cycle as string) ?? "",
        amount: (data.amount as number) ?? 0,
        status: (data.status as string) ?? "",
        createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        confirmedAt: typeof data.confirmedAt === "number" ? data.confirmedAt : null,
        note: (data.note as string | null) ?? null,
    }))

    rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

    return NextResponse.json({ payments: rows.slice(0, 100) })
}
