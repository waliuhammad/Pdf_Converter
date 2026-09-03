/**
 * Where this deployment lives, for sitemap entries, canonical links and OG tags.
 *
 * NEXT_PUBLIC_SITE_URL wins when it is set, because it is the only one that
 * knows about a custom domain. Failing that, Vercel tells us the production
 * host, which spares anyone a deploy that publishes localhost links to Google
 * just because a variable was missed.
 */
export function getSiteUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (explicit) return explicit.replace(/\/$/, "");

    const fromHost =
        process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;
    if (fromHost) return `https://${fromHost.replace(/\/$/, "")}`;

    return "http://localhost:3000";
}
