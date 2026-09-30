import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { readDevPlanFromRequest } from "@/lib/dev-plan";
import { adminConfigProblem, isAdminConfigured } from "@/lib/firebase/admin";
import { getRequestUid } from "@/lib/server-auth";
import { checkAndCountUsage, refundOperation, type UsageResult } from "@/lib/usage";

/**
 * The shared gate for every metered tool route.
 *
 * Returns null when the request may proceed, or a ready-made refusal
 * response (401 signed out / 429 allowance exhausted). One call at the
 * top of a route replaces the blocks that would otherwise be repeated
 * across twenty files. The limit itself comes from the user's plan and the
 * client's Remote Config, inside checkAndCountUsage.
 */
export async function requireUsageAllowance(
    req: NextRequest
): Promise<NextResponse | null> {
    const uid = await getRequestUid(req);
    if (!uid) return signInRefusal();

    const devPlan = readDevPlanFromRequest(req);
    const usage = await countUsage(uid, devPlan ?? undefined);
    if (usage instanceof NextResponse) return usage;
    if (!usage.allowed) return limitRefusal(usage);

    return null;
}

/**
 * checkAndCountUsage, but a Firestore failure becomes a readable 503.
 *
 * It used to throw straight out of the route, which Next turns into a 500 with
 * an empty body — the page could only say "something went wrong". The usual
 * cause is Firestore not being enabled on the Firebase project at all
 * (PERMISSION_DENIED), and that is worth naming in the server log.
 */
async function countUsage(
    uid: string,
    devPlan: Parameters<typeof checkAndCountUsage>[1]
): Promise<UsageResult | NextResponse> {
    try {
        return await checkAndCountUsage(uid, devPlan);
    } catch (error) {
        console.error(
            "metered: could not check the usage allowance in Firestore. If this says " +
                "PERMISSION_DENIED, create the Firestore database in Firebase Console -> " +
                "Build -> Firestore Database.",
            error
        );
        const message = "Could not check your usage allowance right now. Please try again shortly.";
        return NextResponse.json({ success: false, error: message, message }, { status: 503 });
    }
}

function signInRefusal(message = "Please sign in to use the tools."): NextResponse {
    return NextResponse.json(
        { success: false, error: message, message },
        { status: 401 }
    );
}

function limitRefusal(usage: UsageResult): NextResponse {
    // Capped for the same reason the meter caps it: the day's counter can
    // outlive a larger allowance, and "12/5" reads as a fault rather than
    // a limit.
    const spent = Math.min(usage.used, usage.limit);
    const message = `Daily limit reached (${spent}/${usage.limit} operations on the ${usage.plan} plan). Upgrade for a higher daily allowance, or come back tomorrow.`;
    return NextResponse.json({ success: false, error: message, message }, { status: 429 });
}

/** A failed refund is logged, never allowed to replace the tool's own response. */
async function refund(uid: string): Promise<void> {
    try {
        await refundOperation(uid);
    } catch (error) {
        console.error("metered: could not refund the operation:", error);
    }
}

let warnedUnmetered = false;

/**
 * Local development without the Firebase service account.
 *
 * Without FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY no session can be
 * verified, so every tool route answered "Please sign in" — even for a signed-in
 * user — and a fresh clone could not try a single tool. In development only,
 * run the tool unmetered instead and say so once in the log. Production still
 * fails closed: no credentials there means nobody gets through.
 */
function unmeteredLocalDev(): boolean {
    if (process.env.NODE_ENV !== "development" || isAdminConfigured()) return false;

    if (!warnedUnmetered) {
        warnedUnmetered = true;
        console.warn(
            `metered: ${adminConfigProblem()} — running tools without sign-in or usage limits (development only).`
        );
    }
    return true;
}

interface MeteredOptions {
    /** Wording for the 401, so the AI tools can name themselves. */
    signInMessage?: string;
}

/**
 * Wraps a route so its operation is only kept if the user got something back.
 *
 * The allowance used to be claimed at the top of each route and never
 * reconsidered, so an unreadable PDF, a failed conversion, a rejected password
 * or a cancelled request all spent an operation that produced no file. On a
 * 20-a-day plan, a few bad uploads could eat a quarter of the day's allowance
 * without the user ever receiving anything.
 *
 * The claim still happens first — check-then-increment has to be one atomic
 * step or simultaneous requests all pass the same check — but anything other
 * than a successful response gives it back, including a thrown error. So the
 * count follows the result the user actually receives.
 */
export function metered(
    // Response, not NextResponse: the tools that stream a file back build a
    // plain Response, and `ok` is all this needs from it.
    handler: (req: NextRequest) => Promise<Response>,
    options: MeteredOptions = {}
): (req: NextRequest) => Promise<Response> {
    return async function meteredHandler(req: NextRequest): Promise<Response> {
        if (unmeteredLocalDev()) return handler(req);

        const uid = await getRequestUid(req);
        if (!uid) return signInRefusal(options.signInMessage);

        const devPlan = readDevPlanFromRequest(req);
        const usage = await countUsage(uid, devPlan ?? undefined);
        if (usage instanceof NextResponse) return usage;
        if (!usage.allowed) return limitRefusal(usage);

        let response: Response;
        try {
            response = await handler(req);
        } catch (err) {
            await refund(uid);
            throw err;
        }

        // 4xx and 5xx mean no file was delivered, whatever the reason.
        if (!response.ok) await refund(uid);

        return response;
    };
}
