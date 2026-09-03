import "server-only"
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase/admin"
import { getPlan, type PlanId, type BillingCycle } from "@/lib/plans"

/**
 * admin.ts exports no `db`; it hands out the app and each caller opens
 * Firestore from it, which is what lib/usage.ts does. Resolved on call rather
 * than at import so loading this module cannot initialise Firebase as a side
 * effect of a build.
 */
function database(): Firestore {
    return getFirestore(getAdminApp())
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
    const existing = await database()
        .collection("payments")
        .where("uid", "==", args.uid)
        .where("status", "==", "pending")
        .limit(1)
        .get()

    if (!existing.empty) {
        const doc = existing.docs[0]
        const data = doc.data()
        return {
            id: doc.id,
            reference: data.reference as string,
            amount: data.amount as number,
        }
    }

    const reference = makeReference()
    const amount = priceFor(args.planId, args.cycle)
    const ref = database().collection("payments").doc()

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
        createdAt: FieldValue.serverTimestamp(),
    })

    return { id: ref.id, reference, amount }
}

/** Admin-only. Transaction so a double-confirm cannot stack two periods on one payment. */
export async function confirmPayment(paymentId: string, adminUid: string): Promise<void> {
    const store = database()
    const paymentRef = store.collection("payments").doc(paymentId)

    await store.runTransaction(async (tx) => {
        const snap = await tx.get(paymentRef)
        if (!snap.exists) throw new Error("payment not found")

        const payment = snap.data()!
        if (payment.status !== "pending") {
            throw new Error(`payment already ${payment.status}`)
        }

        const subRef = store.collection("subscriptions").doc(payment.uid as string)
        const subSnap = await tx.get(subRef)
        const currentEnd = (subSnap.data()?.currentPeriodEnd as number) ?? 0

        const now = Date.now()
        const periodMs = payment.cycle === "yearly" ? 365 * 864e5 : 30 * 864e5
        // Extend from existing expiry so an early renewal never shortens the plan.
        const start = currentEnd > now ? currentEnd : now

        const periodEnd = start + periodMs

        tx.set(
            subRef,
            {
                provider: "payoneer",
                planId: payment.planId,
                status: "active",
                cycle: payment.cycle,
                currentPeriodEnd: periodEnd,
                autoRenew: false,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        )

        // The subscription document is the billing record, but nothing reads
        // it: every plan check in the app goes through resolvePlan() against
        // users/{uid}. Without this write a confirmed payment upgraded nobody —
        // the tools, the limits and the billing tab all still saw "free".
        tx.set(
            store.collection("users").doc(payment.uid as string),
            {
                plan: payment.planId,
                planExpiresAt: periodEnd,
                updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
        )

        tx.update(paymentRef, {
            status: "paid",
            confirmedAt: FieldValue.serverTimestamp(),
            confirmedBy: adminUid,
        })
    })
}

export async function rejectPayment(
    paymentId: string,
    adminUid: string,
    note: string
): Promise<void> {
    await database().collection("payments").doc(paymentId).update({
        status: "rejected",
        confirmedAt: FieldValue.serverTimestamp(),
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
 * Ordering happens here rather than in the query: `where uid == … orderBy
 * createdAt` needs a composite index, and Firestore only says so the first time
 * it runs, in production, on the screen someone is mid-payment on. A customer
 * has a handful of payments, so sorting a small page costs nothing.
 */
export async function latestPaymentFor(uid: string): Promise<LatestPayment | null> {
    const snap = await database().collection("payments").where("uid", "==", uid).limit(25).get()
    if (snap.empty) return null

    const rows = snap.docs
        .map((doc) => {
            const data = doc.data()
            return {
                id: doc.id,
                reference: (data.reference as string) ?? "",
                amount: (data.amount as number) ?? 0,
                planId: (data.planId as PlanId) ?? "pro",
                cycle: (data.cycle as BillingCycle) ?? "monthly",
                status: (data.status as PaymentStatus) ?? "pending",
                note: (data.note as string | null) ?? null,
                createdAt: data.createdAt?.toMillis?.() ?? null,
            }
        })
        // A pending invoice outranks a settled one regardless of age: it is the
        // one the customer still has to act on.
        .sort((a, b) => {
            if (a.status === "pending" && b.status !== "pending") return -1
            if (b.status === "pending" && a.status !== "pending") return 1
            return (b.createdAt ?? 0) - (a.createdAt ?? 0)
        })

    return rows[0]
}

/** The caller's outstanding invoice, if they have one. */
export async function pendingPaymentFor(
    uid: string
): Promise<{ id: string; reference: string; amount: number } | null> {
    const snap = await database()
        .collection("payments")
        .where("uid", "==", uid)
        .where("status", "==", "pending")
        .limit(1)
        .get()

    if (snap.empty) return null

    const doc = snap.docs[0]
    const data = doc.data()
    return {
        id: doc.id,
        reference: data.reference as string,
        amount: data.amount as number,
    }
}
