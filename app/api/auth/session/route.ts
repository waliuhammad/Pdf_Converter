import { NextRequest, NextResponse } from "next/server";
import {
    adminConfigProblem,
    getAdminAuth,
    isAdminConfigured,
    SESSION_COOKIE,
    SESSION_MAX_AGE_MS,
} from "@/lib/firebase/admin";
import { rateLimit, SESSION_LIMIT } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Trades a Firebase ID token for an httpOnly session cookie, and clears it on
 * sign out.
 *
 * Firebase auth lives entirely in the browser, in IndexedDB, which the server
 * cannot read. That is why the protected routes could only be guarded on the
 * client: the page loaded, then redirected. A session cookie is something the
 * server sees on every request, so proxy.ts can turn the visitor away before
 * any of it renders.
 *
 * httpOnly so scripts cannot read it, sameSite=lax so it survives a normal
 * navigation but not a cross-site form post, and secure outside development.
 */
export async function POST(req: NextRequest) {
    // Each call verifies an ID token against Google, so an unthrottled endpoint
    // is both a way to hammer sign-in and a way to spend someone else's quota.
    const tooMany = rateLimit(req, SESSION_LIMIT);
    if (tooMany) return tooMany;

    if (!isAdminConfigured()) {
        console.error(
            `auth/session: no session cookie can be issued — ${adminConfigProblem()}`
        );
        return NextResponse.json(
            { error: "Sessions are not available right now." },
            { status: 503 }
        );
    }

    let idToken: string | undefined;
    try {
        ({ idToken } = await req.json());
    } catch {
        return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
    }

    if (!idToken) {
        return NextResponse.json({ error: "No ID token provided." }, { status: 400 });
    }

    try {
        const auth = getAdminAuth();

        // Verifying first means a forged token is rejected here rather than
        // becoming a cookie we later trust.
        await auth.verifyIdToken(idToken, true);

        const sessionCookie = await auth.createSessionCookie(idToken, {
            expiresIn: SESSION_MAX_AGE_MS,
        });

        const response = NextResponse.json({ ok: true });
        response.cookies.set({
            name: SESSION_COOKIE,
            value: sessionCookie,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: SESSION_MAX_AGE_MS / 1000,
        });
        return response;
    } catch (error) {
        // The true reason stays in the server log; the browser gets a
        // deliberately generic message.
        console.error("auth/session: could not create a session cookie:", error);
        return NextResponse.json({ error: "Could not sign you in." }, { status: 401 });
    }
}

/** Sign out. Clearing the cookie is all the server needs to do. */
export async function DELETE() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set({
        name: SESSION_COOKIE,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}