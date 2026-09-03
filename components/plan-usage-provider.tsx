"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useTestPlanOptional } from "@/components/dev/TestPlanProvider";

export interface PlanUsage {
    used: number;
    limit: number;
    plan: string;
    storageLimitGb: number;
}

interface PlanUsageValue {
    usage: PlanUsage | null;
    unavailable: boolean;
    loading: boolean;
    refresh: () => void;
}

const PlanUsageContext = createContext<PlanUsageValue | null>(null);

/**
 * One source of plan, daily count and storage allowance for the signed-in area.
 *
 * Two problems it solves. The dashboard renders the usage meter twice (a mobile
 * card and a desktop one) plus the storage tile, and each held its own fetch —
 * three requests for one answer, arriving at three different moments. And every
 * one of them started empty, so the page painted without the numbers and filled
 * them in a moment later.
 *
 * `initial` is read on the server and rendered into the HTML, so the first
 * paint already carries the real figures. The client only refetches when
 * something can have changed it: a plan switch in the tester, or returning to
 * the tab after spending an operation elsewhere.
 */
export function PlanUsageProvider({
    initial,
    children,
}: {
    initial: PlanUsage | null;
    children: React.ReactNode;
}) {
    const [usage, setUsage] = useState<PlanUsage | null>(initial);
    const [unavailable, setUnavailable] = useState(initial === null);
    const testPlan = useTestPlanOptional();

    const activePlan = testPlan?.isTestMode ? testPlan.plan : null;

    const load = useCallback(async (signal?: AbortSignal) => {
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
            // An abort is this provider replacing its own request, not a failure.
            if ((err as Error)?.name === "AbortError") return;
            setUnavailable(true);
        }
    }, []);

    // Skips the first run when the server already supplied the answer: without
    // that guard every load would fetch again immediately for no new
    // information. A plan switch still refetches, because the cookie the
    // endpoint reads has changed.
    useEffect(() => {
        if (initial && activePlan === null) return;

        const controller = new AbortController();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load(controller.signal);
        return () => controller.abort();
    }, [load, activePlan, initial]);

    useEffect(() => {
        const onFocus = () => load();
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [load]);

    const value = useMemo<PlanUsageValue>(
        () => ({
            usage,
            unavailable,
            loading: !usage && !unavailable,
            refresh: () => load(),
        }),
        [usage, unavailable, load]
    );

    return <PlanUsageContext.Provider value={value}>{children}</PlanUsageContext.Provider>;
}

export function usePlanUsageContext(): PlanUsageValue | null {
    return useContext(PlanUsageContext);
}
