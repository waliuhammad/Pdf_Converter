import "server-only";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";
import { resolvePlan, type UserProfile } from "@/lib/firebase/users";
import { getAppConfig } from "@/lib/remote-config";
import type { PlanId } from "@/lib/plans";

/**
 * Daily usage limits, enforced per signed-in user.
 *
 * Each operation increments a counter document keyed by uid and date
 * (usage/{uid}_{YYYY-MM-DD}). The limit for the user's plan comes from
 * the client's Remote Config, so raising a plan's daily allowance in the
 * Firebase Console takes effect within minutes and without a deploy.
 *
 * The check and the increment happen in one Firestore transaction:
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

    const db = getFirestore(getAdminApp());

    // The user's plan decides which limit applies. During local testing,
    // the dev toggle can override what the server sees for the request.
    const profileSnap = await db.collection("users").doc(uid).get();
    const profile = (profileSnap.data() ?? null) as UserProfile | null;
    const plan = devPlanOverride ?? resolvePlan(profile);

    // The client's Remote Config supplies the number; monthly is the
    // reference cycle (their weekly/monthly/yearly values are identical
    // today, and the billing cycle isn't stored per-user yet).
    const { limits, storageGb } = await getAppConfig();
    const limit = limits.monthly[plan];
    const storageLimitGb = storageGb[plan];

    const usageRef = db.collection("usage").doc(`${uid}_${todayKey()}`);

    return await db.runTransaction(async (tx) => {
        const snap = await tx.get(usageRef);
        const used = (snap.data()?.count as number | undefined) ?? 0;

        if (used >= limit) {
            return { allowed: false, used, limit, plan, storageLimitGb };
        }

        tx.set(
            usageRef,
            { uid, date: todayKey(), count: FieldValue.increment(1) },
            { merge: true }
        );

        return { allowed: true, used: used + 1, limit, plan, storageLimitGb };
    });
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

    const db = getFirestore(getAdminApp());
    const usageRef = db.collection("usage").doc(`${uid}_${todayKey()}`);

    try {
        await db.runTransaction(async (tx) => {
            const snap = await tx.get(usageRef);
            const used = (snap.data()?.count as number | undefined) ?? 0;
            if (used <= 0) return;

            tx.set(usageRef, { uid, date: todayKey(), count: used - 1 }, { merge: true });
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

    const db = getFirestore(getAdminApp());

    const profileSnap = await db.collection("users").doc(uid).get();
    const plan = devPlanOverride ?? resolvePlan((profileSnap.data() ?? null) as UserProfile | null);

    const { limits, storageGb } = await getAppConfig();
    const limit = limits.monthly[plan];
    const storageLimitGb = storageGb[plan];

    const snap = await db.collection("usage").doc(`${uid}_${todayKey()}`).get();
    const used = (snap.data()?.count as number | undefined) ?? 0;

    return { allowed: used < limit, used, limit, plan, storageLimitGb };
}