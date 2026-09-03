"use client";

import { useCallback, useEffect, useState } from "react";
import { useTestPlanOptional } from "@/components/dev/TestPlanProvider";
import { usePlanUsageContext, type PlanUsage } from "@/components/plan-usage-provider";

export type { PlanUsage };

/**
 * The signed-in user's plan, daily operation count and storage allowance.
 *
 * Inside the signed-in area a PlanUsageProvider supplies the answer, already
 * filled in on the server, and every caller shares that one request. The
 * standalone fetch below is the fallback for anything rendered outside that
 * provider, so a component using this hook is never left blank because of
 * where it happens to sit in the tree.
 */
export function usePlanUsage() {
    const shared = usePlanUsageContext();

    const [usage, setUsage] = useState<PlanUsage | null>(null);
    const [unavailable, setUnavailable] = useState(false);
    const testPlan = useTestPlanOptional();
    const activePlan = testPlan?.isTestMode ? testPlan.plan : null;

    const standalone = shared === null;

    const load = useCallback(async (signal: AbortSignal) => {
        try {
            const res = await fetch("/api/usage", { signal, cache: "no-store" });
            if (!res.ok) {
                setUnavailable(true);
                return;
            }
            const data = await res.json();
            if (data?.success) {
                setUsage({
                    used: data.used,
                    limit: data.limit,
                    plan: data.plan,
                    storageLimitGb: data.storageLimitGb,
                });
                setUnavailable(false);
            } else {
                setUnavailable(true);
            }
        } catch (err) {
            if ((err as Error)?.name === "AbortError") return;
            setUnavailable(true);
        }
    }, []);

    useEffect(() => {
        if (!standalone) return;

        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(controller.signal);
        return () => controller.abort();
    }, [standalone, load, activePlan]);

    if (shared) return shared;

    return {
        usage,
        unavailable,
        loading: !usage && !unavailable,
        refresh: () => {},
    };
}
