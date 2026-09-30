"use client";

import { Search } from "lucide-react";
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
        <div className="mx-auto w-full max-w-none animate-tool-in md:max-w-[360px]">
            <div className="flex items-center gap-3 rounded-xl border border-input bg-card px-4 py-3.5">
                <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("tools.search")}
                    className="w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                />
            </div>
        </div>
    );
}