"use client";

import { Check, Star, Users } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { useState } from "react";
import { PLANS, type BillingCycle } from "@/lib/plans";
import { CheckoutButton } from "@/components/pricing/checkout-button";

/**
 * `heading` exists because this renders in two places. On the landing page it
 * is one section among many and belongs under that page's h1. On /pricing it is
 * the page, and the page had no h1 at all.
 */
export default function Pricing({ heading = "h2" }: { heading?: "h1" | "h2" }) {
    const Heading = heading;

    const [billing, setBilling] =
        useState<BillingCycle>("monthly");

    return (
        <section id="pricing" className="px-4 sm:px-6 py-12 sm:py-22">
            <div className="max-w-6xl mx-auto">

                {/* Heading */}
                <div className="text-center mb-6 sm:mb-10">
                    <div
                        className="
                            inline-flex
                            items-center
                            gap-2
                            rounded-full
                            bg-card
                            border
                            border-border
                            px-4.5
                            py-2
                            text-xs
                            md:text-sm
                            text-fg
                            mb-5
                        "
                    >
                        <Star size={15} fill="currentColor" className="text-yellow-400" />
                        Rated 4.9/5 by 50,000+ users
                    </div>

                    <Heading className="text-2xl sm:text-3xl md:text-4xl font-bold text-fg">
                        Simple pricing that scales with you
                    </Heading>

                    <p className="mt-3 text-sm md:text-base text-muted">
                        Choose the plan that fits your PDF workflow.
                    </p>

                    {/* Billing Toggle */}
                    <div className="flex justify-center mt-7">
                        <div
                            className="
                                inline-flex
                                rounded-full
                                border
                                border-border
                                bg-card
                                p-1.5
                            "
                        >
                            <button
                                onClick={() => setBilling("monthly")}
                                className={`
                                    px-5.5
                                    py-2.5
                                    rounded-full
                                    text-xs
                                    md:text-sm
                                    font-medium
                                    transition-all
                                    duration-300

                                    ${billing === "monthly"
                                        ? "bg-card border border-border text-fg shadow-sm"
                                        : "text-muted hover:text-fg"
                                    }
                                `}
                            >
                                Monthly
                            </button>

                            <button
                                onClick={() => setBilling("yearly")}
                                className={`
                                    px-5.5
                                    py-2.5
                                    rounded-full
                                    text-xs
                                    md:text-sm
                                    font-medium
                                    transition-all
                                    duration-300

                                    ${billing === "yearly"
                                        ? "bg-card border border-border text-fg shadow-sm"
                                        : "text-muted hover:text-fg"
                                    }
                                `}
                            >
                                Yearly

                                <span
                                    className="ml-2 text-xs text-muted font-normal"
                                >
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Pricing Cards Carousel for Mobile / Grid for Desktop */}
                <div className="
                    flex
                    overflow-x-auto
                    snap-x
                    snap-mandatory
                    scroll-smooth
                    gap-4
                    pb-6
                    pt-4
                    -mx-4
                    px-4
                    scrollbar-none
                    [sub-grid]
                    md:grid
                    md:grid-cols-3
                    md:gap-7
                    md:overflow-visible
                    md:pb-0
                    md:pt-0
                    md:mx-auto
                    md:px-0
                    max-w-5xl
                    items-stretch
                ">
                    {PLANS.map((plan, index) => (
                        <div key={plan.id} className="w-[82vw] sm:w-[320px] md:w-auto shrink-0 md:shrink snap-center h-full flex">
                            <Reveal delay={index * 100} className="h-full w-full flex">
                                <div className={`
                                    relative flex h-full w-full flex-col rounded-2xl bg-card p-5 sm:p-7
                                    shadow-sm transition-all duration-200
                                    hover:-translate-y-1.5 hover:scale-[1.01] hover:shadow-xl
                                    ${plan.popular
                                        ? "border-2 border-primary shadow-lg shadow-orange-500/10"
                                        : "border border-card hover:border-primary/40"
                                    }
                                `}>

                                    {plan.popular && (
                                        <div
                                            className="
                                                absolute
                                                -top-3.5
                                                left-1/2
                                                -translate-x-1/2
                                                bg-primary
                                                text-white
                                                px-4
                                                py-1
                                                rounded-full
                                                text-xs
                                                font-semibold
                                                shadow-md
                                                flex
                                                items-center
                                                gap-1.5
                                                z-10
                                            "
                                        >
                                            <b>Most Popular</b>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <h3 className="
                                            text-lg
                                            md:text-xl
                                            font-bold
                                            text-fg
                                            flex
                                            items-center
                                            gap-2
                                        ">
                                            {plan.name}
                                        </h3>
                                    </div>

                                    <div className="
                                        mt-3.5
                                        text-3xl
                                        md:text-4xl
                                        font-bold
                                        text-fg
                                    ">
                                        {
                                            billing === "monthly"
                                                ?
                                                plan.monthly
                                                :
                                                plan.yearly
                                        }

                                        <span className="
                                            text-xs
                                            md:text-sm
                                            font-normal
                                            text-muted
                                        ">
                                            /month
                                        </span>
                                    </div>

                                    <p className="
                                        mt-3.5
                                        text-xs
                                        md:text-sm
                                        text-muted
                                    ">
                                        {plan.description}
                                    </p>

                                    <ul className="
                                        mt-6
                                        mb-7
                                        space-y-3.5
                                        flex-1
                                    ">
                                        {plan.features.map(feature => (
                                            <li
                                                key={feature}
                                                className="
                                                    flex
                                                    gap-3
                                                    text-xs
                                                    md:text-sm
                                                    text-muted
                                                "
                                            >
                                                <Check
                                                    size={17}
                                                    className="text-primary shrink-0"
                                                />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-auto">
                                        {/* CheckoutButton takes the plan id and the
                                            cycle, not the plan object. */}
                                        <CheckoutButton planId={plan.id} cycle={billing} />
                                    </div>

                                </div>
                            </Reveal>
                        </div>
                    ))}
                </div>

                {/* Reviews */}
                <div
                    className="
                        mt-8
                        md:mt-14
                        mx-auto
                        flex
                        w-full
                        max-w-xs
                        flex-col
                        items-center
                        gap-3
                        rounded-2xl
                        bg-[var(--background-secondary)]
                        px-5
                        py-4
                        text-xs
                        text-muted
                        md:w-auto
                        md:max-w-none
                        md:flex-row
                        md:justify-center
                        md:gap-7
                        md:rounded-none
                        md:bg-transparent
                        md:px-0
                        md:py-0
                        md:text-sm
                    "
                >
                    <div className="
                        flex
                        items-center
                        gap-2
                    ">
                        <Users size={16} className="shrink-0 md:size-[18px]" />
                        Trusted by 50,000+ creators
                    </div>

                    <span className="h-px w-10 bg-[var(--card-border)] md:hidden" />

                    <div className="
                        flex
                        items-center
                        gap-2
                        text-yellow-400
                    ">
                        <div className="flex items-center gap-0.5 md:gap-2">
                            {[1, 2, 3, 4, 5].map(star => (
                                <Star
                                    key={star}
                                    size={15}
                                    fill="currentColor"
                                    className="md:size-[17px]"
                                />
                            ))}
                        </div>

                        <span className="text-muted ml-1 md:ml-1.5">
                            4.9/5 average rating
                        </span>
                    </div>
                </div>

            </div>
        </section>
    );
}