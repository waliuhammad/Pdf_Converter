"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface FormatOption {
    /** Stable value, e.g. ".png". */
    value: string;
    label: string;
}

/**
 * A themed replacement for a native <select>.
 *
 * The option list of a real select is drawn by the operating system: it keeps
 * the OS background, the OS highlight colour and the OS chevron, none of which
 * follow this app's tokens or its light/dark switch. A listbox built from
 * ordinary elements can, which is the point of it.
 */
export function FormatSelect({
    options,
    value,
    onChange,
    label,
}: {
    options: FormatOption[];
    value: string;
    onChange: (value: string) => void;
    label?: string;
}) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listId = useId();

    const selected = options.find((o) => o.value === value) ?? options[0];

    useEffect(() => {
        const onPointerDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onPointerDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointerDown);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div ref={containerRef} className="relative w-full sm:max-w-xs">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={listId}
                aria-label={label}
                className="flex w-full items-center gap-2.5 rounded-xl border border-card bg-card pl-3.5 pr-3 py-2.5 text-left text-sm font-medium text-fg transition-colors hover:border-[var(--primary)] focus:outline-none focus:border-[var(--primary)]"
            >
                <span className="truncate">{selected?.label}</span>

                {/* ml-auto puts it at the trailing edge; mr-0.5 on top of the
                    trigger's padding keeps it off the border rather than tucked
                    into the corner. */}
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`ml-auto mr-0.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-card bg-card py-1 text-sm shadow-lg"
                >
                    {options.map((option) => {
                        const active = option.value === value;

                        return (
                            <li key={option.value} role="option" aria-selected={active}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors ${active
                                        ? "bg-primary/10 text-[var(--primary)] font-semibold"
                                        : "text-fg hover:bg-primary/10"
                                        }`}
                                >
                                    {/* A fixed slot for the tick, so the labels stay
                                        on one left edge whichever row is selected. */}
                                    <span className="w-4 shrink-0">
                                        {active && <Check size={14} />}
                                    </span>

                                    <span className="truncate">{option.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
