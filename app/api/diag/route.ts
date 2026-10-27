// TEMPORARY: reports why firebase-admin fails to load on the host. No secrets.
export const dynamic = "force-dynamic";

export async function GET() {
    const out: Record<string, unknown> = { node: process.version, platform: process.platform };
    const env = (name: string) => {
        const v = process.env[name];
        return v === undefined ? "unset" : `set (${v.length} chars${name === "FIREBASE_PRIVATE_KEY" ? `, begins-key=${v.includes("BEGIN PRIVATE KEY")}, literal-\n=${v.includes("\n")}, real-newlines=${v.includes("\n")}, quoted=${v.startsWith('"')}` : ""})`;
    };
    out.env = Object.fromEntries(["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "AI_SERVICE_URL"].map((n) => [n, env(n)]));
    for (const mod of ["firebase-admin/app", "firebase-admin/auth", "firebase-admin/database"]) {
        try {
            await import(/* turbopackIgnore: true */ mod);
            out[mod] = "ok";
        } catch (e) {
            out[mod] = String((e as Error)?.stack ?? e).split("\n").slice(0, 6);
        }
    }
    try {
        const admin = await import("@/lib/firebase/admin");
        out.configured = admin.isAdminConfigured();
        admin.getAdminAuth();
        out.adminAuth = "ok";
    } catch (e) {
        out.adminAuth = String((e as Error)?.stack ?? e).split("\n").slice(0, 8);
    }
    return Response.json(out);
}
