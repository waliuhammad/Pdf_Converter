"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/hooks/useAuth";

/**
 * The only two pieces of the sidebar that need Firebase.
 *
 * They live apart from the sidebar so it can pull them in with next/dynamic.
 * The sidebar wraps all thirty PDF tools, which work without an account, and
 * importing Firebase directly put 620 KB of auth SDK in the first load of every
 * one of them.
 */

export function SidebarUser({ compact }: { compact: boolean }) {
    const { user, profile } = useAuth();

    if (!user) return null;

    const displayName =
        profile?.fullName || user.displayName || user.email?.split("@")[0] || "Guest";
    const initial = displayName.charAt(0).toUpperCase();

    return (
        <div
            className={`flex items-center gap-2.5 px-2 py-2 mb-2 rounded-xl bg-[var(--background-secondary)] border border-card ${compact ? "justify-center px-0" : ""
                }`}
        >
            <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-sm font-semibold shrink-0">
                {initial}
            </div>
            {!compact && (
                <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{displayName}</p>
                    <p className="text-xs text-muted truncate">{user.email || ""}</p>
                </div>
            )}
        </div>
    );
}

export function SidebarLogout({ compact }: { compact: boolean }) {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
            router.push("/login");
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <button
            onClick={handleLogout}
            disabled={loggingOut}
            title={compact ? "Log out" : undefined}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-base font-medium text-fg hover:bg-[var(--background-secondary)] hover:text-fg transition-all disabled:opacity-60 ${compact ? "justify-center px-2" : ""
                }`}
        >
            <LogOut size={18} className="shrink-0" />
            {!compact && <span>{loggingOut ? "Logging out..." : "Log out"}</span>}
        </button>
    );
}
