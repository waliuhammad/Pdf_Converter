import "server-only"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAdminAuth, isAdminConfigured, SESSION_COOKIE } from "@/lib/firebase/admin"

/**
 * The admin check for every route that can grant a plan or change payment
 * details.
 *
 * It was written out longhand in each route, which is how the three copies
 * drifted — and a guard that differs between the route that lists payments and
 * the route that confirms them is a guard you cannot reason about. One copy
 * here, and the routes state their requirement in a line.
 *
 * Gated on the custom claim rather than a path in proxy.ts: that proxy decides
 * what to render, and rendering is not a security boundary.
 */
export type AdminCheck = { ok: true; uid: string } | { ok: false; response: NextResponse }

function denied(status: number): { ok: false; response: NextResponse } {
    // Deliberately the same wording for "not signed in", "signed in but not an
    // admin" and "expired". Distinguishing them tells an anonymous caller which
    // accounts are admins, which is not something worth leaking to be helpful.
    return { ok: false, response: NextResponse.json({ error: "Not authorized." }, { status }) }
}

export async function requireAdmin(): Promise<AdminCheck> {
    // Without credentials getAdminApp() throws, which would surface as a 500 on
    // a route whose real answer is "this deployment is not configured".
    if (!isAdminConfigured()) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Admin is not available right now." }, { status: 503 }),
        }
    }

    const session = (await cookies()).get(SESSION_COOKIE)?.value
    if (!session) return denied(401)

    try {
        // checkRevoked, so signing out everywhere actually takes effect here.
        const decoded = await getAdminAuth().verifySessionCookie(session, true)
        if (decoded.admin !== true) return denied(403)
        return { ok: true, uid: decoded.uid }
    } catch {
        return denied(401)
    }
}
