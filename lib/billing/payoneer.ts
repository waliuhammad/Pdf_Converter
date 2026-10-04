import "server-only"
import { ServerValue, type Database } from "firebase-admin/database"
import { getAdminDb } from "@/lib/firebase/admin"
import { getPlan, type PlanId, type BillingCycle } from "@/lib/plans"

/**
 * Payments live in the Realtime Database (payments/{id}, subscriptions/{uid}),
 * opened per call so loading this module cannot initialise Firebase as a side
 * effect of a build.
 */
function database(): Database {
    return getAdminDb()
}

/**
 * Payment ids arrive from the admin screen. Anything that is not a plain push
 * id could address a different path ("../users/x"), so refuse it outright.
 */
function paymentPath(paymentId: string): string {
    if (!/^[A-Za-z0-9_-]+$/.test(paymentId)) throw new Error("payment not found")
    return `payments/${paymentId}`
}

interface PaymentRecord {
    uid: string
    email: string | null
    planId: PlanId
    cycle: BillingCycle
    amount: number
    currency: string
    status: PaymentStatus
    provider: string
    reference: string
    createdAt: number
    confirmedAt?: number
    confirmedBy?: string
    note?: string
}

/** Every payment belonging to one user, newest first is up to the caller. */
async function paymentsFor(uid: string): Promise<Array<[string, PaymentRecord]>> {
    const snap = await database().ref("payments").orderByChild("uid").equalTo(uid).get()
    return Object.entries((snap.val() ?? {}) as Record<string, PaymentRecord>)
}

export type PaymentStatus = "pending" | "paid" | "rejected" | "expired"

function makeReference(): string {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    let out = ""
    for (let i = 0; i < 8; i++) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)]
    }
    return `PDFAI-${out}`
}

export function priceFor(planId: PlanId, cycle: BillingCycle): number {
    const plan = getPlan(planId)
    // Both are the amount for their own cycle. This used to multiply the yearly
    // figure by twelve because the field held a per-month equivalent, which
    // meant the invoice was computed from a number nobody could read as a price.
    return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice
}

export async function createPayment(args: {
    uid: string
    email: string | null
    planId: PlanId
    cycle: BillingCycle
}): Promise<{ id: string; reference: string; amount: number }> {
    if (args.planId === "free") throw new Error("cannot invoice the free plan")

    // Reuse any pending invoice — a double-click otherwise means the user
    // pays twice and you owe a refund you cannot automate.
    const pending = await pendingPaymentFor(args.uid)
    if (pending) return pending

    const reference = makeReference()
    const amount = priceFor(args.planId, args.cycle)
    const ref = database().ref("payments").push()

    await ref.set({
        uid: args.uid,
        email: args.email,
        planId: args.planId,
        cycle: args.cycle,
        amount,
        currency: "USD",
        status: "pending",
        provider: "payoneer",
        reference,
        createdAt: ServerValue.TIMESTAMP,
    })

    return { id: ref.key!, reference, amount }
}

/**
 * Admin-only. A double-confirm must not stack two periods on one payment.
 *
 * A Realtime Database transaction covers one location, so the payment's status
 * is claimed first, atomically, pending -> paid: only the caller that wins that
 * claim goes on to extend the plan. The period end is then computed inside a
 * transaction on the subscription, so two different payments confirmed at the
 * same moment for one user both extend it rather than one overwriting the other.
 */
export async function confirmPayment(paymentId: string, adminUid: string): Promise<void> {
    const store = database()
    const paymentRef = store.ref(paymentPath(paymentId))

    const payment = (await paymentRef.get()).val() as PaymentRecord | null
    if (!payment) throw new Error("payment not found")

    let seen: PaymentStatus | null = null
    const claim = await paymentRef.child("status").transaction((current: PaymentStatus | null) => {
        seen = current
        return current === "pending" ? "paid" : undefined
    })
    if (!claim.committed) throw new Error(`payment already ${seen ?? "gone"}`)

    const periodMs = payment.cycle === "yearly" ? 365 * 864e5 : 30 * 864e5
    const sub = await store.ref(`subscriptions/${payment.uid}`).transaction(
        (current: { currentPeriodEnd?: number } | null) => {
            const now = Date.now()
            const currentEnd = current?.currentPeriodEnd ?? 0
            // Extend from existing expiry so an early renewal never shortens the plan.
            const start = currentEnd > now ? currentEnd : now
            return {
                ...(current ?? {}),
                provider: "payoneer",
                planId: payment.planId,
                status: "active",
                cycle: payment.cycle,
                currentPeriodEnd: start + periodMs,
                autoRenew: false,
                updatedAt: Date.now(),
            }
        }
    )
    const periodEnd = (sub.snapshot.val() as { currentPeriodEnd: number }).currentPeriodEnd

    // The subscription record is the billing record, but nothing reads it:
    // every plan check in the app goes through resolvePlan() against
    // users/{uid}. Without this write a confirmed payment upgraded nobody —
    // the tools, the limits and the billing tab all still saw "free".
    await store.ref().update({
        [`users/${payment.uid}/plan`]: payment.planId,
        [`users/${payment.uid}/planExpiresAt`]: periodEnd,
        [`users/${payment.uid}/updatedAt`]: ServerValue.TIMESTAMP,
        [`${paymentPath(paymentId)}/confirmedAt`]: ServerValue.TIMESTAMP,
        [`${paymentPath(paymentId)}/confirmedBy`]: adminUid,
    })
}

export async function rejectPayment(
    paymentId: string,
    adminUid: string,
    note: string
): Promise<void> {
    const ref = database().ref(paymentPath(paymentId))
    if (!(await ref.get()).exists()) throw new Error("payment not found")

    await ref.update({
        status: "rejected",
        confirmedAt: ServerValue.TIMESTAMP,
        confirmedBy: adminUid,
        note,
    })
}

export interface LatestPayment {
    id: string
    reference: string
    amount: number
    planId: PlanId
    cycle: BillingCycle
    status: PaymentStatus
    note: string | null
    createdAt: number | null
}

/**
 * The caller's most recent payment whatever its state.
 *
 * The checkout page watches this to know when an admin has confirmed, so it
 * has to see "paid" and "rejected" too — pendingPaymentFor stops answering the
 * moment the payment stops being pending, which is exactly the moment the
 * customer is waiting to hear about.
 *
 * A customer has a handful of payments, so sorting them here costs nothing.
 */
export async function latestPaymentFor(uid: string): Promise<LatestPayment | null> {
    const rows = (await paymentsFor(uid))
        .map(([id, data]) => ({
            id,
            reference: data.reference ?? "",
            amount: data.amount ?? 0,
            planId: data.planId ?? "pro",
            cycle: data.cycle ?? "monthly",
            status: data.status ?? "pending",
            note: data.note ?? null,
            createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
        }))
        // A pending invoice outranks a settled one regardless of age: it is the
        // one the customer still has to act on.
        .sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1
            if (b.status === "pending" && a.status !== "pending") return 1
            return (b.createdAt ?? 0) - (a.createdAt ?? 0)
        })

    return rows[0] ?? null
}

/** The caller's outstanding invoice, if they have one. */
export async function pendingPaymentFor(
    uid: string
): Promise<{ id: string; reference: string; amount: number } | null> {
    const pending = (await paymentsFor(uid)).find(([, data]) => data.status === "pending")
    if (!pending) return null

    const [id, data] = pending
    return { id, reference: data.reference, amount: data.amount }
}
