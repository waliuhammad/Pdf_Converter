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
            <div className="flex items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3.5 dark:border-orange-500 dark:bg-neutral-900">
                <Search className="h-5 w-5 shrink-0 text-neutral-500 dark:text-neutral-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("tools.search")}
                    className="w-full min-w-0 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0 dark:text-white dark:placeholder:text-neutral-500"
                />
            </div>
        </div>
    );
}