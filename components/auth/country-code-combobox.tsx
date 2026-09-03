"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRY_CODES, DEFAULT_DIAL_CODE } from "@/lib/countryCodes";

interface CountryCodeComboboxProps {
    value: string;
    onChange: (dialCode: string) => void;
}

/** A dial code typed by hand, e.g. "+92" or "+880", for codes not in the list. */
const MANUAL_DIAL_CODE = /^\+\d{1,4}$/;

/**
 * Dial code picker for the phone field.
 *
 * The trigger is a button, not a text input: the field previously doubled as
 * its own filter, so the value shown to the user and the search query were the
 * same string and typing to search destroyed the selected code. Searching now
 * happens in a dedicated box inside the dropdown, leaving the trigger to do
 * nothing but display the current selection.
 *
 * The search box also accepts a code that isn't in COUNTRY_CODES — type it and
 * press Enter.
 */
export function CountryCodeCombobox({ value, onChange }: CountryCodeComboboxProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    // useId, not a literal, so two comboboxes on one page cannot share an id.
    const listId = useId();

    // Every close goes through here, so the next open always starts from the
    // full list rather than a stale filter.
    const close = () => {
        setOpen(false);
        setQuery("");
    };

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

    // Opening puts the caret straight in the search box, so the dropdown can be
    // driven from the keyboard without a second click.
    useEffect(() => {
        if (open) searchRef.current?.focus();
    }, [open]);

    const trimmed = query.trim();
    const needle = trimmed.toLowerCase();
    const filtered = COUNTRY_CODES.filter((c) => {
        if (!needle) return true;
        return (
            c.dialCode.toLowerCase().includes(needle) ||
            c.name.toLowerCase().includes(needle) ||
            c.code.toLowerCase().includes(needle)
        );
    });

    const commit = (dialCode: string) => {
        onChange(dialCode);
        close();
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
        }

        if (e.key !== "Enter") return;
        e.preventDefault();

        // A hand-typed code wins over the list, so an unlisted country is still
        // reachable even when the query happens to match some other name.
        if (MANUAL_DIAL_CODE.test(trimmed)) {
            commit(trimmed);
        } else if (filtered.length > 0) {
            commit(filtered[0].dialCode);
        }
    };

    return (
        // Width fits "+92" plus the chevron rather than stretching to w-20, which
        // left a dead gap between the code and the arrow.
        <div ref={containerRef} className="relative w-16 shrink-0">
            <button
                type="button"
                onClick={() => (open ? close() : setOpen(true))}
                role="combobox"
                aria-label="Country dialling code"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={listId}
                // py-2 matches the phone input beside it; py-2.5 made this box
                // 4px taller than its neighbour.
                className="flex w-full items-center justify-between gap-1 py-2 pl-2.5 pr-1.5 rounded-xl bg-card border border-card text-fg text-sm focus:outline-none focus:border-[var(--primary)] hover:border-[var(--primary)] transition-colors"
            >
                <span className="truncate">{value || DEFAULT_DIAL_CODE}</span>
                <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                // w-56 on a w-16 trigger, anchored left, so country names have room.
                <div className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-card bg-card shadow-lg">
                    <div className="relative border-b border-card p-2">
                        <Search
                            size={14}
                            aria-hidden="true"
                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                        />
                        <input
                            ref={searchRef}
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            aria-label="Search countries or type a dial code"
                            placeholder="Search or type +92"
                            className="w-full rounded-lg bg-[var(--background-secondary)] py-1.5 pl-7 pr-2 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-shadow"
                        />
                    </div>

                    <ul id={listId} role="listbox" className="max-h-56 overflow-y-auto py-1 text-sm">
                        {filtered.map((c) => (
                            <li key={`${c.code}-${c.dialCode}`} role="option" aria-selected={c.dialCode === value}>
                                <button
                                    type="button"
                                    onClick={() => commit(c.dialCode)}
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-fg hover:bg-primary/10 transition-colors"
                                >
                                    <span className="truncate">{c.name}</span>
                                    <span className="text-muted shrink-0">{c.dialCode}</span>
                                </button>
                            </li>
                        ))}

                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-muted">
                                {MANUAL_DIAL_CODE.test(trimmed)
                                    ? `Press Enter to use ${trimmed}`
                                    : "No matching country"}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
