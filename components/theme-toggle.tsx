"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();

    return (
        <button
            type="button"
            aria-label="Toggle theme"
            title="Toggle theme (Light / Dark)"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={`relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-accent/60 transition-all duration-200 shadow-xs active:scale-95 ${className}`}
        >
            <Sun className="h-4.5 w-4.5 text-amber-500 scale-100 dark:scale-0 transition-transform duration-200" />
            <Moon className="absolute h-4.5 w-4.5 text-blue-400 scale-0 dark:scale-100 transition-transform duration-200" />
        </button>
    );
}
