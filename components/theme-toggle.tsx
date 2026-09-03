"use client";

import * as React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
    const { resolvedTheme, setTheme } = useTheme();

    // No mounted flag. It was there to avoid a hydration mismatch on
    // resolvedTheme, but nothing rendered here depends on it — the two icons
    // are swapped by the dark: variants, which follow the class next-themes
    // puts on <html> before the first paint. Only the click handler reads the
    // theme, and that cannot run until after hydration. Dropping it also means
    // the real button is in the HTML rather than an empty box for one frame.
    return (
        <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={`relative flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-muted hover:text-foreground ${className}`}
        >
            <Sun className="size-4 scale-100 dark:scale-0 transition-transform" />
            <Moon className="absolute size-4 scale-0 dark:scale-100 transition-transform" />
        </button>
    );
}
