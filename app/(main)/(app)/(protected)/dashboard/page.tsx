"use client";
import { UsageMeter } from "@/components/usage-meter";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useT } from "@/components/locale-provider";
import { useMemo } from "react";
import Link from "next/link";
import {
    FileText,
    HardDrive,
    Star,
    Upload,
    Wrench,
    Cpu,
    MoreVertical,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { useAuth } from "@/hooks/useAuth";
import { useLibrary } from "@/lib/store";
import { formatRelativeTime, formatStorageUsed } from "@/lib/utils";

const quickActions = [
    { key: "dashboard.upload", icon: Upload, href: "/documents" },
    { key: "nav.tools", icon: Wrench, href: "/tools" },
    { key: "dashboard.aiTools", icon: Cpu, href: "/tools?category=AI%20Tools" },
] as const;

export default function DashboardPage() {
    // Route protection and the loading gate live in the (app) layout.
    const { user, profile } = useAuth();
    const { t } = useT();
    const documents = useLibrary((s) => s.documents);

    // The allowance comes from the plan, through the same request and the same
    // plan resolution the usage meter uses, so the tester switches both.
    const { usage } = usePlanUsage();
    const storageLimitGb =
        usage && Number.isFinite(usage.storageLimitGb) ? usage.storageLimitGb : null;

    // storagePercent went with the Storage Usage card; storageUsedGb still
    // feeds the "Storage Used" stat tile at the top of the page.
    const { storageUsedGb, favouriteCount, recentDocs } = useMemo(() => {
        const usedGb = documents.reduce((total, doc) => total + doc.sizeMb, 0) / 1024;

        return {
            storageUsedGb: usedGb,
            favouriteCount: documents.filter((d) => d.favorite).length,
            // Five, so the panel is filled when there are enough documents to
            // fill it. The rest are on /documents behind "View all".
            recentDocs: [...documents].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
        };
    }, [documents]);

    const displayName =
        profile?.fullName || user?.displayName || user?.email?.split("@")[0] || "there";
    const planLabel = profile?.plan === "paid" ? t("dashboard.paidPlan") : t("dashboard.freePlan");

    return (
        <div>
            <div className="mb-6 animate-tool-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h1 className="text-2xl font-bold text-fg">{t("dashboard.welcome")}, {displayName} 👋</h1>
                        <p className="text-muted text-sm mt-1">{t("dashboard.subtitle")}</p>
                    </div>
                    <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-red-50 text-[var(--primary)] shrink-0">
                        {planLabel}
                    </span>
                </div>
            </div>

            {/* Stats: Desktop version (lg:grid-cols-4), Mobile ultra-compact row (grid-cols-4) */}
            <div className="hidden lg:grid grid-cols-4 gap-4 mb-8">
                <StatCard label={t("dashboard.totalDocuments")} value={String(documents.length)} icon={FileText} />
                {/* "of Y GB" comes from the plan, so the tile states the
                    allowance rather than a bare number with nothing to judge
                    it against. */}
                <StatCard
                    label={t("dashboard.storageUsed")}
                    value={
                        storageLimitGb === null
                            ? formatStorageUsed(storageUsedGb)
                            : `${formatStorageUsed(storageUsedGb)} / ${storageLimitGb} GB`
                    }
                    icon={HardDrive}
                />
                <StatCard label={t("dashboard.favorites")} value={String(favouriteCount)} icon={Star} />
            </div>

            {/* Three across since Chats went: four columns left a visible gap. */}
            <div className="grid grid-cols-3 gap-2 mb-4 lg:hidden">
                <div className="bg-card border border-card rounded-xl p-2 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted truncate w-full">{t("dashboard.docs")}</span>
                    <span className="text-sm font-bold text-fg">{documents.length}</span>
                </div>
                <div className="bg-card border border-card rounded-xl p-2 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted truncate w-full">{t("dashboard.storage")}</span>
                    <span className="text-sm font-bold text-fg">
                        {storageLimitGb === null
                            ? formatStorageUsed(storageUsedGb)
                            : `${formatStorageUsed(storageUsedGb)}/${storageLimitGb}GB`}
                    </span>
                </div>
                <div className="bg-card border border-card rounded-xl p-2 text-center flex flex-col items-center justify-center">
                    <span className="text-[10px] text-muted truncate w-full">{t("dashboard.favs")}</span>
                    <span className="text-sm font-bold text-fg">{favouriteCount}</span>
                </div>
            </div>

            {/* Mobile-only usage meter single card */}
            <div className="block lg:hidden mb-6">
                <div className="bg-card border border-card rounded-2xl p-4 sm:p-6">
                    <UsageMeter hideHeader hideTitle />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent PDFs */}
                <div className="lg:col-span-2 bg-card border border-card rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-fg">{t("dashboard.recentDocuments")}</h2>
                        <Link href="/documents" className="text-sm text-[var(--primary)] font-medium hover:underline">
                            {t("dashboard.viewAll")}
                        </Link>
                    </div>
                    {recentDocs.length === 0 ? (
                        <p className="text-sm text-muted py-6 text-center">
                            {t("dashboard.noDocuments")}
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {recentDocs.map((pdf) => (
                                <div
                                    key={pdf.id}
                                    className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--background-secondary)] transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                            <FileText size={18} className="text-[var(--primary)]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-fg truncate">{pdf.name}</p>
                                            <p className="text-xs text-muted">
                                                {pdf.size} · {formatRelativeTime(pdf.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/documents"
                                        className="text-muted hover:text-fg p-1"
                                        aria-label={`Manage ${pdf.name}`}
                                    >
                                        <MoreVertical size={16} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right column (Laptop layout) */}
                <div className="space-y-6">
                    {/* Desktop-only UsageMeter single card */}
                    <div className="hidden lg:block bg-card border border-card rounded-2xl p-4 sm:p-6">
                        <UsageMeter hideHeader hideTitle />
                    </div>

                    {/* Quick Actions (Desktop version) */}
                    <div className="hidden lg:block bg-card border border-card rounded-2xl p-4 sm:p-6">
                        <h2 className="text-lg font-semibold text-fg mb-4">{t("dashboard.quickActions")}</h2>
                        <div className="space-y-2">
                            {quickActions.map((action) => {
                                const Icon = action.icon;

                                return (
                                    <Link
                                        key={t(action.key)}
                                        href={action.href}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-card hover:border-[var(--primary)] transition-colors"
                                    >
                                        <Icon size={16} className="text-[var(--primary)]" />
                                        <span className="text-sm font-medium text-fg">{t(action.key)}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions (Mobile-only version) */}
            <div className="mt-6 block lg:hidden bg-card border border-card rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t("dashboard.quickActions")}</h2>
                <div className="grid grid-cols-2 gap-2.5">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={t(action.key)}
                                href={action.href}
                                className="flex items-center gap-2.5 p-3 rounded-xl border border-card hover:border-[var(--primary)] bg-[var(--background-secondary)]/40 transition-colors"
                            >
                                <Icon size={16} className="text-[var(--primary)] shrink-0" />
                                <span className="text-xs font-medium text-fg truncate">{t(action.key)}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}