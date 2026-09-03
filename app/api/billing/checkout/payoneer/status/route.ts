import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp, getAdminAuth, isAdminConfigured, SESSION_COOKIE } from "@/lib/firebase/admin"
import { latestPaymentFor } from "@/lib/billing/payoneer"
import { getPayoneerSettings } from "@/lib/billing/payoneer-settings"
import { resolvePlan, type UserProfile } from "@/lib/firebase/users"

export const runtime = "nodejs"

/**
 * Everything the checkout page needs to show the current state of a payment.
 *
 * Polled while a payment is waiting, so that the moment an admin confirms it,
 * the customer's page says so without them refreshing. Polled rather than
 * watched from the browser on purpose: `payments` holds one document per
 * customer transaction, and letting clients subscribe to that collection means
 * loosening Firestore rules over billing records to save a few seconds of
 * latency. The server already knows; it can just be asked.
 */
export async function GET() {
    if (!isAdminConfigured()) {
        return NextResponse.json({ error: "Payments are not available right now." }, { status: 503 })
    }

    const session = (await cookies()).get(SESSION_COOKIE)?.value
    if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 })

    let uid: string
    try {
        const decoded = await getAdminAuth().verifySessionCookie(session, true)
        uid = decoded.uid
    } catch {
        return NextResponse.json({ error: "Your session expired. Sign in again." }, { status: 401 })
    }

    // Read with the admin SDK, the way lib/usage.ts does. getUserProfile() goes
    // through the *client* SDK, which on the server has no signed-in user, so
    // Firestore rules reject it and it returns null — which read as "this user
    // is on the free plan" on the very screen confirming they had upgraded.
    const profileFor = async (): Promise<UserProfile | null> => {
        const snap = await getFirestore(getAdminApp()).collection("users").doc(uid).get()
        return (snap.data() ?? null) as UserProfile | null
    }

    // Fetched together so the page never shows "confirmed" beside a stale plan.
    const [settings, payment, profile] = await Promise.all([
        getPayoneerSettings(),
        latestPaymentFor(uid),
        profileFor(),
    ])

    return NextResponse.json({
        available: settings.ready,
        plan: resolvePlan(profile),
        planExpiresAt: profile?.planExpiresAt ?? null,
        payment,
        payee: settings.ready
            ? {
                  payUrl: settings.payUrl,
                  payeeName: settings.payeeName,
                  payeeEmail: settings.payeeEmail,
                  instructions: settings.instructions,
              }
            : null,
    })
}
