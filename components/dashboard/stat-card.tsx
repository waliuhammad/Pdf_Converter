import { LucideIcon } from "lucide-react";

interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    trend?: string;
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
    return (
        <div className="bg-card  border border-card rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                    <Icon size={18} className="text-[var(--primary)]" />
                </div>
                {trend && <span className="text-xs text-green-600 font-medium">{trend}</span>}
            </div>
            <p className="text-2xl font-bold text-fg">{value}</p>
            <p className="text-sm text-muted mt-0.5">{label}</p>
        </div>
    );
}