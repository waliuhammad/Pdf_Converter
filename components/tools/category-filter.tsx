"use client";

import { useToolText } from "@/hooks/useToolText";

interface CategoryFilterProps {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
}

const categories = [
    "All Tools",
    "Convert",
    "Edit",
    "AI Tools",
    "Security",
    "Organize",
];

export default function CategoryFilter({
    activeCategory,
    setActiveCategory,
}: CategoryFilterProps) {
    const { categoryLabel } = useToolText();

    return (
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`
                            relative
                            shrink-0
                            rounded-xl
                            px-3.5
                            sm:px-4.5
                            py-1.5
                            sm:py-2
                            text-xs
                            sm:text-sm
                            font-medium
                            whitespace-nowrap
                            transition-all
                            duration-200
                            border
                            ${isActive
                                ? "border-primary bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/70"
                            }
                        `}
                    >
                        {categoryLabel(category)}
                    </button>
                );
            })}
        </div>
    );
}
