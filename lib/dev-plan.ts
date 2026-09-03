import type { NextRequest } from "next/server";

export type DevPlanId = "free" | "pro" | "business";
export const DEV_PLAN_COOKIE = "pdfai_test_plan";

export function isDevPlan(value: string | undefined): value is DevPlanId {
    return value === "free" || value === "pro" || value === "business";
}

/** The cookie half of readDevPlanFromRequest, for server components. */
export async function readDevPlanFromCookies(): Promise<DevPlanId | null> {
    if (process.env.NODE_ENV === "production") return null;

    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(DEV_PLAN_COOKIE)?.value;
    return isDevPlan(value) ? value : null;
}

export function readDevPlanFromRequest(req: NextRequest): DevPlanId | null {
    // Both of these are attacker-controlled: a cookie and a header can be set
    // by hand. Outside development that would let anyone award themselves the
    // business allowance, so the override is only read in dev.
    if (process.env.NODE_ENV === "production") return null;

    const cookieValue = req.cookies.get(DEV_PLAN_COOKIE)?.value;
    if (isDevPlan(cookieValue)) return cookieValue;

    const headerValue = req.headers.get("x-test-plan");
    const parsedHeaderValue = headerValue ?? undefined;
    if (isDevPlan(parsedHeaderValue)) return parsedHeaderValue;

    return null;
}
