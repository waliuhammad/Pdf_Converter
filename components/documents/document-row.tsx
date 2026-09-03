"use client";

import { FileText, MoreVertical, Star } from "lucide-react";
import { useState } from "react";

interface DocumentRowProps {
    name: string;
    size: string;
    date: string;
    favorite?: boolean;
    onToggleFavorite?: () => void;
    onDelete?: () => void;
    onRename?: () => void;
}

export function DocumentRow({
    name,
    size,
    date,
    favorite = false,
    onToggleFavorite,
    onDelete,
    onRename,
}: DocumentRowProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-[var(--background-secondary)] transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{name}</p>
                    <p className="text-xs text-muted">{size} · {date}</p>
                </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={onToggleFavorite}
                    className={`p-1.5 rounded-lg transition-colors ${favorite ? "text-yellow-500" : "text-muted opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        }`}
                >
                    <Star size={16} fill={favorite ? "currentColor" : "none"} />
                </button>
                <div className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 rounded-lg text-muted hover:text-fg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                        <MoreVertical size={16} />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 top-8 z-10 w-36 bg-card  border border-card rounded-xl shadow-lg py-1">
                            <button
                                onClick={() => { onRename?.(); setMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-[var(--background-secondary)]"
                            >
                                Rename
                            </button>
                            <button
                                onClick={() => { onDelete?.(); setMenuOpen(false); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-[var(--background-secondary)]"
                            >
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}