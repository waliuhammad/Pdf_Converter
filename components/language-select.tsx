"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";

interface LanguageSelectProps {
    value: string;
    onChange: (language: string) => void;
    className?: string;
}

export default function LanguageSelect({ value, onChange, className = "" }: LanguageSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Close the dropdown when clicking outside of it
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus the search input as soon as the dropdown opens
    useEffect(() => {
        if (open) {
            setTimeout(() => searchRef.current?.focus(), 0);
        }
    }, [open]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return LANGUAGES;
        return LANGUAGES.filter(
            (lang) =>
                lang.name.toLowerCase().includes(q) ||
                lang.native.toLowerCase().includes(q) ||
                lang.code.toLowerCase().includes(q)
        );
    }, [query]);

    const handleSelect = (name: string) => {
        onChange(name);
        setOpen(false);
        setQuery("");
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg text-sm text-fg px-3 py-1.5 focus:outline-none focus:border-[var(--primary)] hover:border-[var(--primary)]/50 transition-colors"
            >
                <span>{value}</span>
                <ChevronDown size={14} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-card shadow-xl shadow-black/30 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                        <Search size={14} className="text-muted shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search languages..."
                            className="w-full bg-transparent text-sm text-fg placeholder:text-muted focus:outline-none"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-center text-xs text-muted">No languages found.</div>
                        ) : (
                            filtered.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => handleSelect(lang.name)}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/5 transition-colors ${
                                        lang.name === value ? "text-[var(--primary)]" : "text-fg"
                                    }`}
                                >
                                    <span className="flex flex-col">
                                        <span>{lang.name}</span>
                                        {lang.native !== lang.name && (
                                            <span className="text-xs text-muted">{lang.native}</span>
                                        )}
                                    </span>
                                    {lang.name === value && <Check size={14} className="shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}