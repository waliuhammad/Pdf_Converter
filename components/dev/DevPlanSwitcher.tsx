"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical, Check } from "lucide-react";
import { useTestPlan, TestPlan } from "./TestPlanProvider";

const plans: {
    id: TestPlan;
    name: string;
    description: string;
}[] = [
        {
            id: "free",
            name: "Free",
            description: "Free user",
        },
        {
            id: "pro",
            name: "Pro",
            description: "Pro plan",
        },
        {
            id: "business",
            name: "Business",
            description: "Business plan",
        },
    ];

export default function DevPlanSwitcher() {
    const { plan, setPlan, isTestMode } = useTestPlan();
    const [open, setOpen] = useState(false);

    if (!isTestMode) {
        return null;
    }

    const currentPlan =
        plans.find((item) => item.id === plan) ?? plans[0];

    return (
        <div className="fixed bottom-4 right-4 z-[9999]">
            {open && (
                <div className="mb-2 w-[240px] overflow-hidden rounded-2xl border border-border bg-background p-2 shadow-2xl">
                    <div className="border-b border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-violet-500" />

                            <span className="text-sm font-semibold">
                                Test Subscription
                            </span>
                        </div>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Development only
                        </p>
                    </div>

                    <div className="mt-2 space-y-1">
                        {plans.map((item) => {
                            const selected = item.id === plan;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setPlan(item.id);
                                        setOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {item.name}
                                        </p>

                                        <p className="text-xs text-muted-foreground">
                                            {item.description}
                                        </p>
                                    </div>

                                    {selected && (
                                        <Check className="h-4 w-4 text-violet-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-900 shadow-lg transition-all hover:shadow-xl dark:border-violet-800 dark:bg-gray-950 dark:text-white"
            >
                <FlaskConical className="h-4 w-4 text-violet-500" />

                <span>
                    Test:{" "}
                    <strong className="text-violet-500">
                        {currentPlan.name}
                    </strong>
                </span>

                <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""
                        }`}
                />
            </button>
        </div>
    );
}