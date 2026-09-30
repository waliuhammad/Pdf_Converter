"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { useToolText } from "@/hooks/useToolText";

interface ToolCardProps {
    name: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color?: string;
    badge?: string;
    comingSoon?: boolean;
}

export default function ToolCard({
    name,
    description,
    icon: Icon,
    href,
    badge,
    comingSoon = false,
}: ToolCardProps) {
    const { toolName, toolDescription, badgeLabel } = useToolText();
    const shownName = toolName(href, name);
    const shownDescription = toolDescription(href, description);
    // The lift on hover was a framer-motion whileHover. This card is on screen
    // twenty-two times on /tools, and the profile put framer among the most
    // expensive scripts there — for a translate and a scale, which CSS does free.
    //
    // Two layouts, one component. Three of these share a row on a phone, so at
    // roughly 110px wide the content is centred and the type is small: icon
    // above a short title above a clamped description. From sm it is the
    // original left-aligned card, min-h-[165px] included, so a grid row stays
    // even.
    const card = (
        <div
            className={`
                group
                relative
                flex
                h-full
                w-full
                flex-col
                items-center
                overflow-hidden
                rounded-2xl
                border
                border-border
                bg-card
                p-5
                text-center
                transition-all
                duration-200
                hover:border-foreground/30
                hover:shadow-xl
                sm:min-h-[82px]
                sm:flex-row
                sm:items-center
                sm:gap-4
                sm:p-4
                sm:text-left
                ${comingSoon ? "" : "hover:-translate-y-[5px] hover:scale-[1.02]"}
            `}
        >
            {/* Icon */}
            <div
                className={`
                    group/icon
                    relative
                    mb-2
                    flex
                    h-9
                    w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-accent
                    ring-1
                    ring-primary/20
                    shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_4%,transparent),0_8px_20px_color-mix(in_srgb,var(--primary)_12%,transparent)]
                    motion-safe:animate-icon-pulse
                    transition-all
                    duration-300
                    group-hover/icon:ring-primary/40
                    group-hover/icon:shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_8%,transparent),0_10px_26px_color-mix(in_srgb,var(--primary)_24%,transparent)]
                    sm:mb-0
                    sm:h-10
                    sm:w-10
                    sm:rounded-2xl
                `}
            >
                <span className="pointer-events-none absolute inset-0 -translate-x-full rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-opacity duration-300 group-hover/icon:animate-shimmer group-hover/icon:opacity-100 dark:via-white/25" />
                <Icon
                    size={16}
                    className="relative z-10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover/icon:rotate-3 sm:size-[19px]"
                />
            </div>

            {/* min-w-0 lets a long name like "PDF to PowerPoint" wrap inside the
                column instead of forcing the card wider than its grid track. */}
            <div className="w-full min-w-0 sm:flex-1">
                <h3 className="text-[10px] font-semibold leading-tight text-foreground transition-colors duration-300 [overflow-wrap:anywhere] group-hover:text-primary sm:text-sm sm:leading-snug">
                    {shownName}
                </h3>

                <p className="mt-1 hidden text-[9px] leading-tight text-muted-foreground line-clamp-3 sm:mt-1 sm:block sm:text-xs sm:leading-5 sm:line-clamp-2">
                    {shownDescription}
                </p>
            </div>

            {/* Badge. Sits under the description on a phone, where a corner chip
                would cover the title in a 110px-wide card; the original absolute
                top-right corner from sm. */}
            {(comingSoon || badge) && (
                <span
                    className="
                        absolute
                        right-3
                        top-3
                        rounded-full
                        bg-accent
                        px-2
                        py-0.5
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-wide
                        text-accent-foreground
                    "
                >
                    {comingSoon ? badgeLabel("Soon") : badgeLabel(badge!)}
                </span>
            )}

            {/* Hover Glow */}
            <div
                className="
                    pointer-events-none
                    absolute
                    inset-0
                    bg-gradient-to-br
                    from-primary/5
                    via-transparent
                    to-primary/5
                    opacity-0
                    transition-opacity
                    duration-300
                    group-hover:opacity-100
                "
            />
        </div>
    );

    // Tools without a page yet render as a plain container so they can't 404.
    return comingSoon ? (
        <div className="block h-full cursor-not-allowed opacity-60">{card}</div>
    ) : (
        // Twenty-two of these sit on /tools, and Next prefetches every link in
        // view: 112 requests for a page where one card gets clicked, several of
        // them fetched repeatedly as the grid re-renders on search. Hover is
        // early enough to prefetch.
        <Link href={href} prefetch={false} className="block h-full">
            {card}
        </Link>
    );
}
