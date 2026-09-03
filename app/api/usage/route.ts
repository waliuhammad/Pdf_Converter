import { NextRequest, NextResponse } from "next/server";
import { readDevPlanFromRequest } from "@/lib/dev-plan";
import { getRequestUid } from "@/lib/server-auth";
import { requireUsageAllowance } from "@/lib/metered";
import { peekUsage, refundOperation } from "@/lib/usage";

/**
 * Reports the signed-in user's tool usage for today without consuming any:
 * { used, limit, plan }. The dashboard and tool pages read this to show
 * "X of Y operations used today" and to explain a 429 before it happens.
 */
export async function GET(req: NextRequest) {
    const uid = await getRequestUid(req);
    if (!uid) {
        return NextResponse.json(
            { success: false, message: "Not signed in." },
            { status: 401 }
        );
    }

    // The metered tool routes honour the dev plan toggle through
    // requireUsageAllowance, but this one did not, so the meter always
    // reported the Firestore profile's plan and its limit. Switching the
    // tester to pro or business changed what the tools enforced while the
    // card still read "free plan".
    const devPlan = readDevPlanFromRequest(req);
    const usage = await peekUsage(uid, devPlan ?? undefined);

    return NextResponse.json({
        success: true,
        used: usage.used,
        limit: usage.limit,
        plan: usage.plan,
        // The storage allowance follows the same plan resolution, so the
        // dashboard tile and the meter can never disagree about which plan
        // the numbers belong to.
        storageLimitGb: usage.storageLimitGb,
    });
}

/**
 * Claims one operation from today's allowance, for tools that do their work in
 * the browser.
 *
 * Most tools POST the file to their own route, and that route meters the
 * request on the way through. Three of them — image-to-pdf, excel-to-pdf and
 * pdf-to-image — convert entirely in the page, so they never reached a route
 * and never counted: on the free plan they ran without limit while every other
 * tool stopped at five.
 *
 * The decision is still made here rather than in the browser. The client asks
 * before it starts and does nothing if refused, so the plan is enforced by the
 * same counter, the same limits and the same dev-plan override as everywhere
 * else. A user who bypasses the request keeps a conversion their browser did
 * anyway — the point is that the allowance is real for normal use, not that
 * client-side work can be policed.
 */
export async function POST(req: NextRequest) {
    const refusal = await requireUsageAllowance(req);
    if (refusal) return refusal;

    return NextResponse.json({ success: true });
}

/**
 * Gives back an operation claimed for work that then failed.
 *
 * The routes that do their own work refund automatically, because the server
 * sees the failure. These three tools convert in the browser, so only the
 * browser knows the conversion threw — and without this, a file the library
 * could not read still cost the user an operation.
 */
export async function DELETE(req: NextRequest) {
    const uid = await getRequestUid(req);
    if (!uid) {
        return NextResponse.json({ success: false, message: "Not signed in." }, { status: 401 });
    }

    await refundOperation(uid);
    return NextResponse.json({ success: true });
}