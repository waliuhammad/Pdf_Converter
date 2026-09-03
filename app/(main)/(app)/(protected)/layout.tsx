import { ProtectedRoute } from "@/components/protected-route";
import { PlanUsageProvider, type PlanUsage } from "@/components/plan-usage-provider";
import { getSessionUid } from "@/lib/server-auth";
import { readDevPlanFromCookies } from "@/lib/dev-plan";
import { peekUsage } from "@/lib/usage";

/**
 * Wraps only the routes backed by user data — dashboard, documents and
 * settings. The PDF tools deliberately sit outside this group so anonymous
 * visitors arriving from the marketing pages can still use them.
 *
 * The plan's limits are read here, on the server, so the dashboard's first
 * paint already shows the real allowance. They used to be fetched from the
 * browser after mount, which is why the usage and storage figures appeared a
 * moment after the page did.
 */
export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let initial: PlanUsage | null = null;

    try {
        const uid = await getSessionUid();
        if (uid) {
            const devPlan = await readDevPlanFromCookies();
            const usage = await peekUsage(uid, devPlan ?? undefined);

            // peekUsage answers Infinity when admin credentials are missing,
            // and that does not survive serialisation to the client. Leaving
            // `initial` null there hands the question back to the browser
            // rather than seeding the page with a nonsense number.
            if (Number.isFinite(usage.limit) && Number.isFinite(usage.storageLimitGb)) {
                initial = {
                    used: usage.used,
                    limit: usage.limit,
                    plan: usage.plan,
                    storageLimitGb: usage.storageLimitGb,
                };
            }
        }
    } catch {
        // Firestore or Remote Config unreachable. The client provider will ask
        // again; rendering the page without the figures beats failing it.
    }

    return (
        <PlanUsageProvider initial={initial}>
            <ProtectedRoute>{children}</ProtectedRoute>
        </PlanUsageProvider>
    );
}
