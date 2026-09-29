"use client";

import { useMemo, useState } from "react";
import { Reveal } from "@/components/reveal";
import Link from "next/link";

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
            className="bg-background px-8 py-13 text-foreground md:px-12 md:py-15"
        >
            <div className="mx-auto max-w-7xl">
                <div className="grid gap-8 md:grid-cols-2 md:items-end md:gap-11">
                    <Reveal>
                        <div className="max-w-2xl">
                            <span className="inline-block rounded-sm bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
                                PDF toolkit
                            </span>

                            <h1 className="mt-4 text-[2.15rem] font-medium leading-snug text-foreground sm:text-[2.75rem]">
                                All your PDF tools, one place
                            </h1>

                            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Convert, edit, compress and organize your files in seconds.
                            </p>
                            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Powered by AI to save you the busywork.
                            </p>

                            <Link
                                href="/register"
                                className="group relative mt-4 inline-flex overflow-hidden rounded-lg border border-transparent bg-primary px-5 py-2.5 text-base font-medium text-primary-foreground transition-all duration-300 hover:border-ring hover:bg-primary/90 hover:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_20%,transparent),0_10px_24px_-12px_var(--primary)]"
                            >
                                <span className="pointer-events-none absolute inset-0 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full dark:via-white/30" />
                                <span className="relative z-10">Get started free</span>
                            </Link>
                        </div>
                    </Reveal>

                    <Reveal>
                        <div className="flex flex-col items-center">
                            <SearchTool
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                            />
                        </div>
                    </Reveal>
                </div>

                <div className="mt-12 flex flex-wrap gap-2 sm:mt-16">
                    <CategoryFilter
                        activeCategory={activeCategory}
                        setActiveCategory={setActiveCategory}
                    />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {filteredTools.map((tool, index) => (
                        <Reveal key={tool.name} delay={index * 50} className="h-full">
                            <div className="h-full">
                                <ToolCard {...tool} />
                            </div>
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    );
}