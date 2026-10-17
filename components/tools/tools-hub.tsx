"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Wrench } from "lucide-react";

import ToolCard from "./tool-card";
import { tools } from "@/lib/tools";
import { useToolText } from "@/hooks/useToolText";
import { useT } from "@/components/locale-provider";

// "All" first, then whatever categories the tool list actually declares, so a new
// category in lib/tools.ts shows up here without touching this file.
const categories = ["All", ...Array.from(new Set(tools.map((t) => t.category)))];

export function ToolsHub() {
    const { categoryLabel } = useToolText();
    const { t } = useT();
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");

    // Deep links like /tools?category=AI%20Tools still work, but reading the
    // URL here rather than from searchParams on the server is what lets the
    // page stay static. The grid is prerendered showing everything, so there is
    // no empty state to look at while this runs.
    useEffect(() => {
        const wanted = new URLSearchParams(window.location.search).get("category");
        // Deriving this during render would need useSearchParams, and that opts
        // the whole page out of static rendering — which is exactly what the
        // note above says this avoids. As initial state it would mismatch,
        // since the prerendered HTML cannot know the query string.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (wanted && categories.includes(wanted)) setCategory(wanted);
    }, []);

    const filteredTools = useMemo(() => {
        const query = search.trim().toLowerCase();

        return tools.filter((tool) => {
            const matchesSearch =
                !query ||
                tool.name.toLowerCase().includes(query) ||
                tool.description.toLowerCase().includes(query);

            const matchesCategory = category === "All" || tool.category === category;

            return matchesSearch && matchesCategory;
        });
    }, [search, category]);

    return (
        <div className="w-full max-w-7xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{t("tools.allTools")}</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {filteredTools.length === 1 ? t("tools.availableOne") : t("tools.available", { count: filteredTools.length })}
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("tools.search")}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-card shadow-xs"
                    />
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-card overflow-x-auto no-scrollbar shadow-xs">
                    {categories.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onClick={() => setCategory(option)}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                                category === option
                                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                            {categoryLabel(option)}
                        </button>
                    ))}
                </div>
            </div>

            {filteredTools.length === 0 ? (
                <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card p-8">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-accent text-accent-foreground flex items-center justify-center mb-3">
                        <Wrench size={20} className="text-primary" />
                    </div>
                    <p className="text-foreground text-sm font-semibold">{t("tools.noMatch")} &ldquo;{search}&rdquo;.</p>
                    <p className="text-muted-foreground text-xs mt-1">Try searching with different keywords or switch category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:gap-3 lg:grid-cols-4">
                    {filteredTools.map((tool, index) => (
                        <div
                            key={tool.name}
                            className="motion-safe:animate-tool-in h-full"
                            style={{ animationDelay: `${Math.min(index * 25, 250)}ms` }}
                        >
                            <ToolCard {...tool} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
