import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/firebase/require-admin"
import { confirmPayment, rejectPayment } from "@/lib/billing/payoneer"

export const runtime = "nodejs"

/**
 * Grants or refuses a paid plan.
 *
 * This is the only place in the product where money becomes access, and it is
 * a human decision: nothing here checks that the payment arrived, so whoever
 * clicks confirm is asserting they saw it in the Payoneer account.
 */
export async function POST(req: Request) {
    const check = await requireAdmin()
    if (!check.ok) return check.response

    const body = await req.json().catch(() => null)
    const paymentId = body?.paymentId as string
    if (!paymentId) {
        return NextResponse.json({ error: "Missing payment id." }, { status: 400 })
    }

    try {
        if (body?.action === "reject") {
            await rejectPayment(paymentId, check.uid, (body?.note as string) ?? "")
        } else {
            await confirmPayment(paymentId, check.uid)
        }
        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error("[payoneer] confirm failed", err)
        // "payment already paid" is the message that matters most here — it is
        // what a double-confirm looks like, and the admin should see exactly
        // that rather than a generic failure they will retry.
        const message = err instanceof Error ? err.message : "Could not update this payment."
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
