import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/firebase/require-admin"
import { getPayoneerSettings, savePayoneerSettings } from "@/lib/billing/payoneer-settings"

// firebase-admin needs Node, not Edge — same reason proxy.ts runs on Node.
export const runtime = "nodejs"

/** The current Payoneer account details, for the admin settings screen. */
export async function GET() {
    const check = await requireAdmin()
    if (!check.ok) return check.response

    return NextResponse.json({ settings: await getPayoneerSettings() })
}

/** Saves the account details. Admin-only: this decides where customer money goes. */
export async function PUT(req: Request) {
    const check = await requireAdmin()
    if (!check.ok) return check.response

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "Nothing to save." }, { status: 400 })
    }

    // Pulled out field by field rather than spread: a spread would let a caller
    // write updatedBy, or any other key, straight into the document.
    const patch: Parameters<typeof savePayoneerSettings>[0] = {}
    if (typeof body.payUrl === "string") patch.payUrl = body.payUrl
    if (typeof body.payeeName === "string") patch.payeeName = body.payeeName
    if (typeof body.payeeEmail === "string") patch.payeeEmail = body.payeeEmail
    if (typeof body.instructions === "string") patch.instructions = body.instructions
    if (typeof body.enabled === "boolean") patch.enabled = body.enabled

    if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "Nothing to save." }, { status: 400 })
    }

    try {
        return NextResponse.json({ settings: await savePayoneerSettings(patch, check.uid) })
    } catch (err) {
        // savePayoneerSettings rejects a placeholder link by design, and that
        // message is written for the admin reading it — pass it through rather
        // than replacing it with something generic.
        const message = err instanceof Error ? err.message : "Could not save these settings."
        return NextResponse.json({ error: message }, { status: 400 })
    }
}
