"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [loading, user, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-sm text-muted">Loading...</p>
            </div>
        );
    }

    if (!user) return null; // redirect is in-flight

    return <>{children}</>;
}