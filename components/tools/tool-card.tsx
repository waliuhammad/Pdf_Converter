"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { useToolText } from "@/hooks/useToolText";
import { getToolIllustration } from "./tool-icons";

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

    // Illustrative icon from reference design; fallback to Lucide icon
    const illustration = getToolIllustration(href, 64);

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
                sm:min-h-[88px]
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
                    h-14
                    w-14
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    transition-all
                    duration-300
                    sm:mb-0
                    sm:h-16
                    sm:w-16
                    sm:rounded-2xl
                `}
            >
                {illustration ?? (
                    <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-accent ring-1 ring-primary/20">
                        <Icon
                            size={24}
                            className="relative z-10 text-primary transition-transform duration-300 group-hover:scale-110 group-hover/icon:rotate-3 sm:size-[28px]"
                        />
                    </div>
                )}
            </div>

            {/* min-w-0 lets a long name wrap inside the column */}
            <div className="w-full min-w-0 sm:flex-1">
                <h3 className="text-[10px] font-semibold leading-tight text-foreground transition-colors duration-300 [overflow-wrap:anywhere] group-hover:text-primary sm:text-sm sm:leading-snug">
                    {shownName}
                </h3>

                <p className="mt-1 hidden text-[9px] leading-tight text-muted-foreground line-clamp-3 sm:mt-1 sm:block sm:text-xs sm:leading-5 sm:line-clamp-2">
                    {shownDescription}
                </p>
            </div>

            {/* Badge */}
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

    return comingSoon ? (
        <div className="block h-full cursor-not-allowed opacity-60">{card}</div>
    ) : (
        <Link href={href} prefetch={false} className="block h-full">
            {card}
        </Link>
    );
}
