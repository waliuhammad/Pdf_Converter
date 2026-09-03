"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/hooks/useAuth";

/**
 * Which frame the tool pages get.
 *
 * The tools are usable without an account but live in the signed-in layout, so
 * every visitor was given the app sidebar — Dashboard, My Documents and
 * Settings, all of which bounce a signed-out visitor to the login page.
 *
 * Signed in: the sidebar, as before. Signed out: the marketing header, so the
 * page still has somewhere to go — hiding the sidebar on its own would leave a
 * tool page with no navigation at all.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    const main = (
        <main className="flex-1 w-full min-w-0 px-4 sm:px-6 lg:px-8 py-6">
            {children}
        </main>
    );

    // Neither frame while auth resolves. Guessing wrong either way is visible:
    // the sidebar would flash at signed-out visitors, or the header would flash
    // at signed-in ones. The tool itself renders throughout.
    if (loading) {
        return <div className="min-h-full flex flex-col">{main}</div>;
    }

    if (!user) {
        return (
            <div className="min-h-full flex flex-col">
                <Navbar />
                {main}
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col md:flex-row">
            <Sidebar />
            {main}
        </div>
    );
}
