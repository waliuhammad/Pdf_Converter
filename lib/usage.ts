import "server-only";
import { getAdminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { resolvePlan, type UserProfile } from "@/lib/firebase/users";
import { getAppConfig } from "@/lib/remote-config";
import type { PlanId } from "@/lib/plans";

/**
 * Daily usage limits, enforced per signed-in user.
 *
 * Each operation increments a counter in the Realtime Database keyed by uid
 * and date (usage/{uid}/{YYYY-MM-DD}). The limit for the user's plan comes from
 * the client's Remote Config, so raising a plan's daily allowance in the
 * Firebase Console takes effect within minutes and without a deploy.
 *
 * The check and the increment happen in one Realtime Database transaction:
 * two requests racing on the last allowed operation can't both slip
 * through a read-then-write gap.
 */

export interface UsageResult {
    /** The plan's storage allowance in gigabytes, from Remote Config. */
    storageLimitGb: number;
    allowed: boolean;
    used: number;
    limit: number;
    plan: PlanId;
}

/** Today's date in UTC, e.g. "2026-08-10" — the counter's reset boundary. */
function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

export async function checkAndCountUsage(uid: string, devPlanOverride?: PlanId): Promise<UsageResult> {
    // Limits unenforceable without admin credentials: fail open rather
    // than lock every tool because of a configuration problem.
    if (!isAdminConfigured()) {
        return { allowed: true, used: 0, limit: Infinity, plan: "free", storageLimitGb: Infinity };
    }

    const db = getAdminDb();

    // The user's plan decides which limit applies. During local testing,
    // the dev toggle can override what the server sees for the request.
    const plan = devPlanOverride ?? resolvePlan(await readProfile(uid));

    // The client's Remote Config supplies the number; monthly is the
    // reference cycle (their weekly/monthly/yearly values are identical
    // today, and the billing cycle isn't stored per-user yet).
    const { limits, storageGb } = await getAppConfig();
    const limit = limits.monthly[plan];
    const storageLimitGb = storageGb[plan];

    // Returning undefined from the update function aborts the transaction,
    // which is how "already at the limit" is reported: committed === false.
    const { committed, snapshot } = await db
        .ref(usagePath(uid))
        .transaction((current: number | null) => {
            const used = current ?? 0;
            if (used >= limit) return undefined;
            return used + 1;
        });

    const used = (snapshot.val() as number | null) ?? 0;
    if (!committed) return { allowed: false, used, limit, plan, storageLimitGb };

    return { allowed: true, used, limit, plan, storageLimitGb };
}

/** usage/{uid}/{YYYY-MM-DD}: a plain number, today's operation count. */
function usagePath(uid: string): string {
    return `usage/${uid}/${todayKey()}`;
}

async function readProfile(uid: string): Promise<UserProfile | null> {
    const snap = await getAdminDb().ref(`users/${uid}`).get();
    return (snap.val() ?? null) as UserProfile | null;
}

/**
 * Give back an operation that produced nothing.
 *
 * The allowance is claimed before the work starts, because that is the only
 * point where the check and the increment can be one atomic step — without it,
 * requests fired together would all read the same count and all pass. The cost
 * is that a failure, a rejected file or a cancelled conversion spent an
 * operation the user never got a result from. This returns it.
 *
 * Floored at zero inside the transaction: a refund that arrives after the day
 * has rolled over, or twice for one claim, must not push the counter negative
 * and hand out free operations tomorrow.
 */
export async function refundOperation(uid: string): Promise<void> {
    if (!isAdminConfigured()) return;

    try {
        await getAdminDb()
            .ref(usagePath(uid))
            .transaction((current: number | null) => {
                // The first attempt runs against the local cache, which on a
                // server is always empty. Aborting there would never reach the
                // real value, so answer null (no change if it really is empty)
                // and let the database retry with what it actually holds.
                if (current === null) return null;
                if (current <= 0) return undefined;
                return current - 1;
            });
    } catch (err) {
        // A failed refund must not turn a tool error into a second error for
        // the user; the worst case is one operation they did not receive.
        console.error("Could not refund an operation:", err);
    }
}

/** Read-only variant for showing "X of Y used today" without consuming one. */
export async function peekUsage(uid: string, devPlanOverride?: PlanId): Promise<UsageResult> {
    if (!isAdminConfigured()) {
        return { allowed: true, used: 0, limit: Infinity, plan: "free", storageLimitGb: Infinity };
    }

    const plan = devPlanOverride ?? resolvePlan(await readProfile(uid));

    const { limits, storageGb } = await getAppConfig();
    const limit = limits.monthly[plan];
    const storageLimitGb = storageGb[plan];

    const snap = await getAdminDb().ref(usagePath(uid)).get();
    const used = (snap.val() as number | null) ?? 0;

    return { allowed: used < limit, used, limit, plan, storageLimitGb };
}