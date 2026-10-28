import { getAdsensePublisherId } from "@/lib/adsense";

/**
 * /ads.txt, which declares Google as an authorised seller of this site's ad
 * space. The line is the one Google's ads.txt guide gives; f08c47fec0942fa0 is
 * Google's fixed certification authority ID. With no publisher ID configured
 * there is nothing true to declare, so it answers 404 rather than a guess.
 */
export function GET() {
    const publisherId = getAdsensePublisherId();
    if (!publisherId) return new Response("Not found", { status: 404 });

    return new Response(`google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`, {
        headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
        },
    });
}
