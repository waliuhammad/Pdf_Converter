"use client";

import { Search, X } from "lucide-react";
import { useT } from "@/components/locale-provider";

interface SearchToolProps {
    searchQuery: string;
    setSearchQuery: (value: string) => void;
}

export default function SearchTool({
    searchQuery,
    setSearchQuery,
}: SearchToolProps) {
    const { t } = useT();
    return (
        <div className="w-full max-w-xl mx-auto">
            <div className="relative flex items-center w-full rounded-xl border border-border bg-card shadow-xs transition-all duration-200 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/15 focus-within:shadow-sm">
                <Search className="absolute left-4 h-4.5 w-4.5 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("tools.search")}
                    aria-label="Search tools"
                    className="w-full min-w-0 bg-transparent py-3 pl-11 pr-10 text-sm sm:text-base text-foreground outline-none placeholder:text-muted-foreground font-normal"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                        className="absolute right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}