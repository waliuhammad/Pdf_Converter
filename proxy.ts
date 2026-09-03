import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
    adminConfigProblem,
    getAdminAuth,
    isAdminConfigured,
    SESSION_COOKIE,
} from "@/lib/firebase/admin";

/**
 * Guards the signed-in area on the server.
 *
 * Note the filename: Next 16 renamed middleware.ts to proxy.ts, and a file
 * called middleware.ts now does nothing at all. It also runs on the Node.js
 * runtime by default, which is what makes this possible — the old Edge
 * middleware could not load firebase-admin.
 *
 * Until now these routes were guarded only by a client component: the page
 * loaded, React mounted, useAuth resolved, and only then did it redirect. The
 * visitor saw the dashboard shell first. Now the request never reaches the page.
 *
 * This is a redirect, not the security boundary. The data is protected by
 * Firestore rules, which is where it belongs — a proxy can only decide what to
 * render.
 */

// /admin is here so its shell never renders for a signed-out visitor. The real
// gate is the admin claim, checked by every route under /api/admin — this only
// decides what renders, and the admin pages hold no data until those answer.
// /checkout is here so an anonymous visitor is sent to sign in and returned to
// the same plan afterwards, rather than reaching a payment page that can only
// answer 401 — a payment has to belong to an account.
const PROTECTED = ["/dashboard", "/documents", "/settings", "/admin", "/checkout"];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
        return NextResponse.next();
    }

    // With no credentials configured there is nothing to verify against.
    // Falling open would silently drop the guard, so refuse instead and say why
    // in the log — a misconfigured deploy should be obvious, not invisible.
    if (!isAdminConfigured()) {
        console.error(
            `proxy: cannot verify ${pathname} — ${adminConfigProblem()}`
        );
        return redirectToLogin(request);
    }

    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (!session) return redirectToLogin(request);

    try {
        // checkRevoked, so signing out everywhere actually takes effect.
        await getAdminAuth().verifySessionCookie(session, true);
        return NextResponse.next();
    } catch {
        // Expired, revoked or forged. Clear it so the browser stops sending it.
        const response = redirectToLogin(request);
        response.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
        return response;
    }
}

function redirectToLogin(request: NextRequest) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // So the visitor lands back where they were headed after signing in.
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
}

// Both lists have to agree: the matcher decides which requests reach the proxy
// at all, so a path listed only in PROTECTED above is never actually checked.
export const config = {
    matcher: [
        "/dashboard/:path*",
        "/documents/:path*",
        "/settings/:path*",
        "/admin/:path*",
        "/checkout",
        "/checkout/:path*",
    ],
};
