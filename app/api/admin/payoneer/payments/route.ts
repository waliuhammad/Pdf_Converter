import { NextResponse } from "next/server"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase/admin"
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

    const payments = getFirestore(getAdminApp()).collection("payments")

    let docs
    try {
        docs = (await payments.where("status", "==", status).orderBy("createdAt", "desc").limit(100).get()).docs
    } catch (err) {
        // where + orderBy on different fields needs a composite index, and
        // Firestore only tells you that the first time it is queried — in
        // production, on the screen the admin needs to release someone's plan.
        // The list is capped at 100 either way, so sorting here costs nothing
        // and the queue stays usable until the index is built.
        console.error("[payoneer] falling back to unordered payments query — create the composite index", err)
        docs = (await payments.where("status", "==", status).limit(100).get()).docs
    }

    const rows: Row[] = docs.map((doc) => {
        const data = doc.data()
        return {
            id: doc.id,
            reference: (data.reference as string) ?? "",
            email: (data.email as string | null) ?? null,
            planId: (data.planId as string) ?? "",
            cycle: (data.cycle as string) ?? "",
            amount: (data.amount as number) ?? 0,
            status: (data.status as string) ?? "",
            // Firestore Timestamps are not JSON-serialisable.
            createdAt: data.createdAt?.toMillis?.() ?? null,
            confirmedAt: data.confirmedAt?.toMillis?.() ?? null,
            note: (data.note as string | null) ?? null,
        }
    })

    rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

    return NextResponse.json({ payments: rows })
}
