import { updateProfile, type User } from "firebase/auth";
import { getDb } from "./client";
import { type PlanId } from "@/lib/plans";

export interface UserProfile {
    fullName: string;
    email: string;
    phone: string | null;
    /**
     * "paid" is the original two-state value, written before the plans had
     * names. Documents created then still carry it, so it is still read; new
     * ones store the plan id itself.
     */
    plan: PlanId | "paid";
    /**
     * When the paid period ends, in epoch milliseconds. Written when a payment
     * is confirmed. Payoneer payments do not renew on their own, so without an
     * expiry a single payment would grant the plan permanently.
     *
     * Absent on profiles that predate paid plans, which are free anyway.
     */
    planExpiresAt?: number;
}

/**
 * The plan a profile is actually on.
 *
 * Firestore hands back whatever is in the document, which is not necessarily
 * one of these strings — an older record, a hand-edited field, or a missing
 * profile because the read failed. This decides what someone is entitled to,
 * so anything unrecognised resolves to "free" rather than being trusted.
 * Wrongly showing a paying customer the free plan is a support message;
 * wrongly granting paid features to everyone is not.
 */
export function resolvePlan(profile: UserProfile | null | undefined): PlanId {
    // A lapsed period is the free plan. Checked here rather than by a scheduled
    // job so it holds everywhere the plan is read — the tools, the daily limits
    // and the billing tab — the moment the period ends, with no job to miss.
    // Profiles with no expiry are left alone: they predate paid plans.
    if (
        profile?.planExpiresAt !== undefined &&
        Number.isFinite(profile.planExpiresAt) &&
        profile.planExpiresAt <= Date.now()
    ) {
        return "free";
    }

    switch (profile?.plan) {
        case "pro":
        case "business":
            return profile.plan;
        // Predates named plans, and Pro is the tier it was sold as.
        case "paid":
            return "pro";
        default:
            return "free";
    }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
        const [{ doc, getDoc }, db] = await Promise.all([
            import("firebase/firestore"),
            getDb(),
        ]);

        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists()) return null;
        return snap.data() as UserProfile;
    } catch (err) {
        // Firestore not available yet (e.g. billing not enabled) — caller falls back gracefully.
        console.warn("Could not fetch user profile from Firestore:", err);
        return null;
    }
}

/**
 * Updates the display name on the Firebase Auth record first — that is what the
 * sidebar and dashboard actually read — then mirrors it to the user document.
 *
 * The Firestore write is best-effort, matching how getUserProfile already
 * tolerates Firestore being unavailable or locked down by security rules.
 * Reporting the whole save as failed would be wrong, since the name has in fact
 * changed, so the caller is told whether the mirror succeeded instead.
 */
export async function updateUserProfile(
    user: User,
    fullName: string
): Promise<{ syncedToDatabase: boolean }> {
    await updateProfile(user, { displayName: fullName });

    try {
        const [{ doc, setDoc }, db] = await Promise.all([
            import("firebase/firestore"),
            getDb(),
        ]);

        await setDoc(doc(db, "users", user.uid), { fullName }, { merge: true });
        return { syncedToDatabase: true };
    } catch (err) {
        console.warn("Could not mirror the profile to Firestore:", err);
        return { syncedToDatabase: false };
    }
}