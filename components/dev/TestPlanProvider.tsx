"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
} from "react";

export type TestPlan = "free" | "pro" | "business";

type TestPlanContextType = {
    plan: TestPlan;
    setPlan: (plan: TestPlan) => void;
    isTestMode: boolean;
    isFree: boolean;
    isPro: boolean;
    isBusiness: boolean;
    hasPlan: (requiredPlan: TestPlan) => boolean;
};

const TestPlanContext = createContext<TestPlanContextType | undefined>(
    undefined
);

const STORAGE_KEY = "pdf-aid-test-plan";
const COOKIE_NAME = "pdfai_test_plan";

const planLevel: Record<TestPlan, number> = {
    free: 0,
    pro: 1,
    business: 2,
};

function isTestPlan(value: string | null | undefined): value is TestPlan {
    return value === "free" || value === "pro" || value === "business";
}

/**
 * The selected plan, from localStorage first and the cookie second.
 *
 * Both are written on every change: localStorage is what this provider reads,
 * and the cookie is what the server reads, so the tools and the usage meter
 * agree with the switch.
 */
function readStoredPlan(): TestPlan {
    if (typeof window === "undefined") return "free";

    const saved = localStorage.getItem(STORAGE_KEY);
    if (isTestPlan(saved)) return saved;

    const fromCookie = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${COOKIE_NAME}=`))
        ?.split("=")[1];

    return isTestPlan(fromCookie) ? fromCookie : "free";
}

/**
 * localStorage is an external store, so it is subscribed to rather than copied
 * into state by an effect.
 *
 * The effect version rendered "free" first and corrected itself immediately
 * after mount, so the tester briefly disagreed with itself on every page load
 * — and it only ever noticed changes made by this tab. Subscribing fixes both:
 * there is no first-render-then-correct, and switching plan in one tab reaches
 * the others through the storage event.
 */
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    // Fired by other tabs; this tab notifies its own listeners directly.
    window.addEventListener("storage", onChange);

    return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onChange);
    };
}

function notify(): void {
    for (const listener of listeners) listener();
}

/** Servers have no localStorage, and no tester either — always the free plan. */
function serverSnapshot(): TestPlan {
    return "free";
}

export function TestPlanProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const enablePlanTester =
        process.env.NEXT_PUBLIC_ENABLE_PLAN_TESTER ?? "true";

    const isTestMode =
        process.env.NODE_ENV !== "production" &&
        enablePlanTester !== "false";

    const stored = useSyncExternalStore(subscribe, readStoredPlan, serverSnapshot);

    // Outside test mode the stored value is ignored entirely, which is what
    // kept the tester from leaking into production before.
    const plan: TestPlan = isTestMode ? stored : "free";

    const setPlan = useCallback(
        (newPlan: TestPlan) => {
            if (!isTestMode) return;

            localStorage.setItem(STORAGE_KEY, newPlan);
            document.cookie = `${COOKIE_NAME}=${newPlan}; path=/; max-age=31536000; SameSite=Lax`;
            notify();
        },
        [isTestMode]
    );

    const hasPlan = useCallback(
        (requiredPlan: TestPlan) => {
            if (!isTestMode) return false;
            return planLevel[plan] >= planLevel[requiredPlan];
        },
        [isTestMode, plan]
    );

    const value = useMemo(
        () => ({
            plan,
            setPlan,
            isTestMode,
            isFree: plan === "free",
            isPro: plan === "pro",
            isBusiness: plan === "business",
            hasPlan,
        }),
        [plan, isTestMode, setPlan, hasPlan]
    );

    return (
        <TestPlanContext.Provider value={value}>
            {children}
        </TestPlanContext.Provider>
    );
}

export function useTestPlanOptional() {
    return useContext(TestPlanContext);
}

export function useTestPlan() {
    const context = useTestPlanOptional();

    if (!context) {
        throw new Error(
            "useTestPlan must be used inside TestPlanProvider"
        );
    }

    return context;
}
