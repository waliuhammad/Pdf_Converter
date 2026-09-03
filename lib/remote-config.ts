import "server-only";
import { getRemoteConfig, type ServerTemplate } from "firebase-admin/remote-config";
import { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin";
import type { PlanId } from "@/lib/plans";

/**
 * Server-side Remote Config: values changeable from the Firebase Console
 * with no redeploy. Read on the server so limits can't be tampered with
 * in the browser.
 *
 * The parameter schema follows what the client created in their project:
 * {cycle}_{plan}_plan_all = how many operations that plan allows per 24h,
 * for weekly/monthly/yearly billing cycles. Two extra parameters of ours
 * (maintenance_banner, ai_tools_enabled) fall back to safe defaults until
 * they exist in the console.
 *
 * Defaults below are the source of truth when Remote Config is unreachable
 * or a parameter doesn't exist, so the app never breaks because a console
 * value is missing.
 */

export type PlanCycle = "weekly" | "monthly" | "yearly";

const DEFAULTS = {
    maintenance_banner: "",
    ai_tools_enabled: "true",

    weekly_free_plan_all: "2",
    weekly_pro_plan_all: "20",
    weekly_business_plan_all: "50",
    monthly_free_plan_all: "2",
    monthly_pro_plan_all: "20",
    monthly_business_plan_all: "50",
    yearly_free_plan_all: "2",
    yearly_pro_plan_all: "20",
    yearly_business_plan_all: "50",

    // Storage allowance per plan, in gigabytes. Same story as the operation
    // limits: tunable from the Console without a deploy.
    free_plan_storage_gb: "2",
    pro_plan_storage_gb: "5",
    business_plan_storage_gb: "10",
} as const;

export interface AppConfig {
    maintenanceBanner: string;
    aiToolsEnabled: boolean;
    /** Daily operation limits: limits[cycle][plan] = ops per 24 hours. */
    limits: Record<PlanCycle, Record<PlanId, number>>;
    /** Storage allowance per plan, in gigabytes. */
    storageGb: Record<PlanId, number>;
}

let template: ServerTemplate | null = null;
let loadedAt = 0;

// Remote Config keeps two separate templates per project and the Console
// opens on the client one, so a value edited there is invisible to
// getServerTemplate() and the app silently keeps its built-in default. The
// client template is read as a fallback for any parameter the server
// template does not supply, so a limit typed into either place takes effect.
let clientParams: Record<string, string> | null = null;
let clientLoadedAt = 0;

// One fetch per minute per server instance. This was five minutes, which is a
// long time to stare at a stale number after changing it in the Console.
const TTL_MS = 60 * 1000;

// A missing Server template is an expected state (it just hasn't been
// created in the Console yet), not a fault worth repeating on every
// request — warn once, run on defaults, and keep retrying quietly so
// the app picks the template up as soon as someone publishes it.
let warnedMissingTemplate = false;

async function getTemplate(): Promise<ServerTemplate | null> {
    if (!isAdminConfigured()) return null;

    const now = Date.now();
    if (template && now - loadedAt < TTL_MS) return template;

    try {
        const rc = getRemoteConfig(getAdminApp());
        // No defaultConfig on purpose. Seeding it with DEFAULTS made a missing
        // parameter evaluate to the default, which is indistinguishable from
        // the template genuinely holding that number — so the client-template
        // fallback below could never fire. Missing keys now read as 0/"" and
        // the fallback chain in getAppConfig decides.
        const next = await rc.getServerTemplate({ defaultConfig: {} });
        template = next;
        loadedAt = now;
        warnedMissingTemplate = false;
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("NOT_FOUND")) {
            if (!warnedMissingTemplate) {
                console.warn(
                    "Remote Config: no Server template published yet — using built-in defaults. " +
                    "Create it in Firebase Console -> Remote Config -> (dropdown) Server."
                );
                warnedMissingTemplate = true;
            }
        } else {
            // Keep serving the previous template (or defaults) rather than fail.
            console.error("Remote Config fetch failed:", err);
        }
    }
    return template;
}

/**
 * Parameter values from the *client* template, flattened to strings.
 * Returns an empty map on any failure — this is a fallback, so a project
 * without a client template must not break the request.
 */
async function getClientParams(): Promise<Record<string, string>> {
    if (!isAdminConfigured()) return {};

    const now = Date.now();
    if (clientParams && now - clientLoadedAt < TTL_MS) return clientParams;

    try {
        const rc = getRemoteConfig(getAdminApp());
        const t = await rc.getTemplate();
        const out: Record<string, string> = {};

        for (const [key, param] of Object.entries(t.parameters ?? {})) {
            const dv = param.defaultValue;
            // The other shape is { useInAppDefault: true }, which carries no
            // value and should fall through to our own default.
            if (dv && "value" in dv && typeof dv.value === "string") {
                out[key] = dv.value;
            }
        }

        clientParams = out;
        clientLoadedAt = now;
    } catch {
        // No client template, or no permission to read it. Keep whatever was
        // cached (or nothing) and let the built-in defaults apply.
        clientParams = clientParams ?? {};
    }

    return clientParams;
}

function defaultLimits(): AppConfig["limits"] {
    const limitOf = (key: keyof typeof DEFAULTS) => Number(DEFAULTS[key]);
    return {
        weekly: {
            free: limitOf("weekly_free_plan_all"),
            pro: limitOf("weekly_pro_plan_all"),
            business: limitOf("weekly_business_plan_all"),
        },
        monthly: {
            free: limitOf("monthly_free_plan_all"),
            pro: limitOf("monthly_pro_plan_all"),
            business: limitOf("monthly_business_plan_all"),
        },
        yearly: {
            free: limitOf("yearly_free_plan_all"),
            pro: limitOf("yearly_pro_plan_all"),
            business: limitOf("yearly_business_plan_all"),
        },
    };
}

function defaultStorage(): AppConfig["storageGb"] {
    return {
        free: Number(DEFAULTS.free_plan_storage_gb),
        pro: Number(DEFAULTS.pro_plan_storage_gb),
        business: Number(DEFAULTS.business_plan_storage_gb),
    };
}

export async function getAppConfig(): Promise<AppConfig> {
    const [t, client] = await Promise.all([getTemplate(), getClientParams()]);
    const d = defaultLimits();
    const ds = defaultStorage();

    /** Client-template value for a key, when it parses as a positive number. */
    const fromClient = (key: string): number | null => {
        const raw = client[key];
        if (raw === undefined) return null;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 ? value : null;
    };

    if (!t) {
        const limits = defaultLimits();
        for (const cycle of ["weekly", "monthly", "yearly"] as PlanCycle[]) {
            for (const plan of ["free", "pro", "business"] as PlanId[]) {
                const v = fromClient(`${cycle}_${plan}_plan_all`);
                if (v !== null) limits[cycle][plan] = v;
            }
        }
        const storageGb = defaultStorage();
        for (const plan of ["free", "pro", "business"] as PlanId[]) {
            const v = fromClient(`${plan}_plan_storage_gb`);
            if (v !== null) storageGb[plan] = v;
        }

        return {
            maintenanceBanner: client.maintenance_banner ?? DEFAULTS.maintenance_banner,
            aiToolsEnabled: (client.ai_tools_enabled ?? DEFAULTS.ai_tools_enabled) === "true",
            limits,
            storageGb,
        };
    }

    const config = t.evaluate();

    // Server template first, then the client template, then the built-in
    // default. Without the middle step a limit edited on the Console's default
    // (client) tab looked like it had no effect at all.
    const num = (key: string, fallback: number) => {
        const value = config.getNumber(key);
        if (Number.isFinite(value) && value > 0) return value;
        return fromClient(key) ?? fallback;
    };

    return {
        maintenanceBanner: config.getString("maintenance_banner") || (client.maintenance_banner ?? ""),
        // Read as a string through the same three-step chain: getBoolean cannot
        // tell "set to false" from "absent", and absent must mean enabled.
        aiToolsEnabled:
            (config.getString("ai_tools_enabled") ||
                client.ai_tools_enabled ||
                DEFAULTS.ai_tools_enabled) === "true",
        limits: {
            weekly: {
                free: num("weekly_free_plan_all", d.weekly.free),
                pro: num("weekly_pro_plan_all", d.weekly.pro),
                business: num("weekly_business_plan_all", d.weekly.business),
            },
            monthly: {
                free: num("monthly_free_plan_all", d.monthly.free),
                pro: num("monthly_pro_plan_all", d.monthly.pro),
                business: num("monthly_business_plan_all", d.monthly.business),
            },
            yearly: {
                free: num("yearly_free_plan_all", d.yearly.free),
                pro: num("yearly_pro_plan_all", d.yearly.pro),
                business: num("yearly_business_plan_all", d.yearly.business),
            },
        },
        storageGb: {
            free: num("free_plan_storage_gb", ds.free),
            pro: num("pro_plan_storage_gb", ds.pro),
            business: num("business_plan_storage_gb", ds.business),
        },
    };
}