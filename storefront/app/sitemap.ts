import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap { const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"; return ["", "/products", "/about"].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: "weekly", priority: path === "" ? 1 : 0.7 })); }
