import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Signed-in areas and auth flows hold nothing a crawler should index,
            // and /api only ever returns files or JSON.
            disallow: [
                "/api/",
                "/dashboard",
                "/settings",
                "/login",
                "/register",
                "/forget-password",
                "/reset-password",
                "/verify-otp",
            ],
        },
        sitemap: `${siteUrl}/sitemap.xml`,
    };
}
