import "server-only";
import { NextRequest, NextResponse } from "next/server";

/**
 * A small fixed-window limiter for the endpoints that mint a session.
 *
 * Firebase already throttles repeated failed sign-ins, so the password itself
 * is not wide open. What was unprotected is this app's own session endpoint: it
 * verifies an ID token and issues a cookie, and nothing stopped that being
 * called as fast as a script could manage — each call costing a token
 * verification against Google.
 *
 * Deliberately in memory. A shared store would survive restarts and span
 * replicas, but it is another service to run and pay for, and this runs as a
 * single container. The limits below are chosen so that losing the counters on
 * deploy costs nothing: they exist to stop a script, not to be an audit trail.
 */

interface Window {
    count: number;
    /** When this window ends, in ms since the epoch. */
    resetAt: number;
}

const windows = new Map<string, Window>();

/** Stops the map growing without bound on a long-running server. */
function sweep(now: number): void {
    if (windows.size < 5000) return;
    for (const [key, window] of windows) {
        if (window.resetAt <= now) windows.delete(key);
    }
}

/**
 * The caller's address.
 *
 * Railway terminates TLS in front of the app, so the socket address is its
 * proxy for every request — x-forwarded-for is the only thing that
 * distinguishes callers. It can be spoofed by whoever speaks to the proxy
 * directly, which is why this limits abuse rather than enforcing identity.
 */
function callerKey(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
    return req.headers.get("x-real-ip") ?? "unknown";
}

export interface RateLimit {
    /** How many requests are allowed in a window. */
    limit: number;
    /** Window length in milliseconds. */
    windowMs: number;
    /** Distinguishes one endpoint's budget from another's. */
    name: string;
}

/**
 * Returns a 429 when the caller has spent this window's budget, or null.
 *
 * Retry-After is included so a well-behaved client waits the right amount
 * rather than retrying immediately and digging itself deeper.
 */
export function rateLimit(req: NextRequest, { limit, windowMs, name }: RateLimit): NextResponse | null {
    const now = Date.now();
    sweep(now);

    const key = `${name}:${callerKey(req)}`;
    const existing = windows.get(key);

    if (!existing || existing.resetAt <= now) {
        windows.set(key, { count: 1, resetAt: now + windowMs });
        return null;
    }

    existing.count += 1;
    if (existing.count <= limit) return null;

    const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
        {
            success: false,
            error: "Too many attempts. Please wait a moment and try again.",
            message: "Too many attempts. Please wait a moment and try again.",
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
}

/**
 * Signing in, and the session cookie that follows it.
 *
 * Twenty a minute is far above anyone using the site — a person signs in once —
 * and far below what a credential-stuffing script wants.
 */
export const SESSION_LIMIT: RateLimit = {
    name: "session",
    limit: 20,
    windowMs: 60_000,
};
