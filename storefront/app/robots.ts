import type { MetadataRoute } from "next";

import { isComingSoonEnabled } from "./_lib/coming-soon";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots { if (isComingSoonEnabled()) return { rules: { userAgent: "*", disallow: "/" } }; const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; return { rules: { userAgent: "*", allow: "/" }, sitemap: `${baseUrl}/sitemap.xml` }; }
