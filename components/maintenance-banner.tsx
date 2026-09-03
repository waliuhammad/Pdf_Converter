import { getAppConfig } from "@/lib/remote-config";

/**
 * Site-wide notice controlled from Firebase Console -> Remote Config
 * (parameter: maintenance_banner). Empty value = renders nothing.
 * A server component, so the message arrives with the page itself.
 */
export async function MaintenanceBanner() {
    const { maintenanceBanner } = await getAppConfig();

    if (!maintenanceBanner.trim()) return null;

    return (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-center text-sm text-amber-600">
            {maintenanceBanner}
        </div>
    );
}