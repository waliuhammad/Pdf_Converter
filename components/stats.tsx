"use client";

import { Reveal } from "@/components/reveal";
import {
    Users,
    FileText,
    Globe2,
    ShieldCheck,
    TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    decimals?: number;
}

function AnimatedNumber({
    value,
    duration = 2,
    decimals = 0,
}: AnimatedNumberProps) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start: number | null = null;

        const animate = (timestamp: number) => {
            if (!start) start = timestamp;

            const progress = Math.min(
                (timestamp - start) / (duration * 1000),
                1
            );

            setCount(progress * value);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    return (
        <>
            {count.toLocaleString(undefined, {
                maximumFractionDigits: decimals,
            })}
        </>
    );
}

const stats = [
    {
        icon: Users,
        value: 50000,
        suffix: "+",
        title: "Active Users",
        growth: "+28%",
        description: "Growing every month",
    },
    {
        icon: FileText,
        value: 10000000,
        suffix: "+",
        title: "PDFs Processed",
        growth: "+350K",
        description: "Processed this week",
    },
    {
        icon: Globe2,
        value: 150,
        suffix: "+",
        title: "Countries",
        growth: "+12",
        description: "Global availability",
    },
    {
        icon: ShieldCheck,
        value: 99.99,
        suffix: "%",
        decimals: 2,
        title: "Uptime",
        growth: "99.9%",
        description: "Reliable infrastructure",
    },
];

export function Stats() {
    return (
        <section className="py-12 sm:py-20 px-4 sm:px-6">
            <div className="mx-auto max-w-7xl">

                <div className="text-center mb-14">
                    <span className="inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                        Platform Statistics
                    </span>

                    <h2 className="mt-4 sm:mt-5 text-2xl sm:text-3xl md:text-4xl font-bold">
                        Trusted by professionals worldwide
                    </h2>

                    <p className="mt-4 text-muted max-w-2xl mx-auto">
                        Millions of documents processed securely every month with
                        enterprise-grade reliability.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {stats.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <Reveal key={item.title} delay={index * 100} className="h-full">
                                <div className="group h-full rounded-3xl border border-border bg-card p-5 sm:p-7 transition-all duration-200 hover:border-primary/40 hover:shadow-xl hover:-translate-y-2 hover:scale-[1.02]">
                                <div className="flex items-center justify-between">
                                    <div className="rounded-2xl bg-primary/10 p-4">
                                        <Icon className="h-7 w-7 text-primary" />
                                    </div>

                                    <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-500">
                                        <TrendingUp size={14} />
                                        {item.growth}
                                    </div>
                                </div>

                                <h3 className="mt-6 sm:mt-8 text-3xl sm:text-4xl font-bold">
                                    <AnimatedNumber
                                        value={item.value}
                                        decimals={item.decimals}
                                    />
                                    {item.suffix}
                                </h3>

                                <p className="mt-2 font-semibold">
                                    {item.title}
                                </p>

                                <p className="mt-1 text-sm text-muted">
                                    {item.description}
                                </p>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}