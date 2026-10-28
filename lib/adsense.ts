/**
 * The site's AdSense publisher ID, from ADSENSE_PUBLISHER_ID, normalised to the
 * "pub-" form (the value can be pasted as either "pub-…" or "ca-pub-…").
 *
 * This only feeds the ownership meta tag and /ads.txt — it loads no ad script
 * and shows no ads. Unset or malformed, both are left out, so a typo can never
 * publish a wrong seller record.
 */
export function getAdsensePublisherId(): string | null {
    const raw = process.env.ADSENSE_PUBLISHER_ID?.trim().replace(/^ca-/, "");
    return raw && /^pub-\d{10,20}$/.test(raw) ? raw : null;
}
