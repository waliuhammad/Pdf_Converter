"use client";

import { useCallback } from "react";
import { useT } from "@/components/locale-provider";
import { BADGE_TEXT, CATEGORY_TEXT, TOOL_TEXT } from "@/lib/i18n/tools";

/**
 * Tool names, descriptions, category labels and badges in the current locale.
 *
 * The tool list itself stays English in lib/tools.ts — that is the data the
 * routes and the search are built on, and translating it in place would mean
 * the filter and the URLs changed with the language. Only what is shown is
 * translated, looked up by the tool's route, which does not change.
 */
export function useToolText() {
    const { locale } = useT();

    const toolName = useCallback(
        (href: string, fallback: string) => TOOL_TEXT[href]?.[locale]?.[0] ?? fallback,
        [locale]
    );

    const toolDescription = useCallback(
        (href: string, fallback: string) => TOOL_TEXT[href]?.[locale]?.[1] ?? fallback,
        [locale]
    );

    const categoryLabel = useCallback(
        (category: string) => CATEGORY_TEXT[category]?.[locale] ?? category,
        [locale]
    );

    const badgeLabel = useCallback(
        (badge: string) => BADGE_TEXT[badge]?.[locale] ?? badge,
        [locale]
    );

    return { toolName, toolDescription, categoryLabel, badgeLabel };
}
