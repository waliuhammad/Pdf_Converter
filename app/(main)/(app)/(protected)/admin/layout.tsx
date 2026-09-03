"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const TABS = [
    { href: "/admin/payments", label: "Payments" },
    { href: "/admin/payoneer", label: "Payoneer settings" },
]

/**
 * The admin area's shell.
 *
 * Every page here is reachable only with the `admin` custom claim, which the
 * APIs enforce; proxy.ts additionally sends signed-out visitors to the login
 * page so the shell does not render for them at all. Neither is a substitute
 * for the other — the proxy decides what renders, the claim decides what the
 * data layer will do.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            <nav className="mb-6 flex gap-2 overflow-x-auto no-scrollbar" aria-label="Admin">
                {TABS.map((tab) => {
                    const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            aria-current={active ? "page" : undefined}
                            className={`shrink-0 rounded-xl border px-3 py-2 text-sm transition ${
                                active
                                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                                    : "border-card bg-card text-fg hover:bg-[var(--background-secondary)]"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    )
                })}
            </nav>

            {children}
        </div>
    )
}
