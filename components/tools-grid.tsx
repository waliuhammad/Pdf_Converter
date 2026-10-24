"use client";

import { HeroBackdrop } from "@/components/hero-backdrop";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/reveal";

import ToolCard from "./tools/tool-card";
import SearchTool from "./tools/search-tools";
import CategoryFilter from "./tools/category-filter";

import { tools } from "@/lib/tools";

export function ToolsGrid() {
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All Tools");

    const filteredTools = useMemo(() => {
        return tools.filter((tool) => {
            const matchesSearch =
                tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tool.description.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory =
                activeCategory === "All Tools" ||
                tool.category === activeCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, activeCategory]);

    return (
        <section
            id="tools"
            className="relative overflow-hidden bg-background px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 sm:pb-16 text-foreground"
        >
            <HeroBackdrop />
            <div className="relative mx-auto max-w-7xl">
                {/* Compact Hero Section */}
                <div className="mx-auto max-w-3xl text-center mb-6 sm:mb-8">
                    <Reveal>
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 dark:bg-primary/20 px-3.5 py-1 text-xs font-semibold text-primary dark:text-blue-400">
                            Professional PDF Platform
                        </div>

                        <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                            All your PDF tools, in one place
                        </h1>

                        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                            Convert, edit, compress, and organize your documents in seconds. Fast, secure, and powered by AI.
                        </p>
                    </Reveal>

                    {/* Prominent Search Bar */}
                    <div className="mt-5">
                        <SearchTool
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                        />
                    </div>

                    {/* Categories Filter Pills */}
                    <div className="mt-4 flex justify-center">
                        <CategoryFilter
                            activeCategory={activeCategory}
                            setActiveCategory={setActiveCategory}
                        />
                    </div>
                </div>

                {/* Responsive Tool Grid: Desktop 4, Tablet 2-3, Mobile 2, Narrow 1 */}
                {filteredTools.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-card p-8">
                        <p className="text-sm font-medium text-foreground">
                            No tools match &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Try checking for spelling or choose a different category.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery("");
                                setActiveCategory("All Tools");
                            }}
                            className="mt-4 inline-flex items-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                        >
                            Reset search
                        </button>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        {filteredTools.map((tool, index) => (
                            <Reveal key={tool.name} delay={Math.min(index * 25, 250)} className="h-full">
                                <div className="h-full">
                                    <ToolCard {...tool} />
                                </div>
                            </Reveal>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}