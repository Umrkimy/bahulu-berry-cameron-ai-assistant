import { social, tiktokVideoIds } from "./content.ts";

export type TikTokVideo = { id: string; caption: string };
type OEmbed = { title?: string; thumbnail_url?: string };

export function isFeaturedVideo(id: string): boolean {
  return (tiktokVideoIds as readonly string[]).includes(id);
}

export function videoUrl(id: string): string {
  return `${social.tiktokUrl}/video/${id}`;
}

// Keeps the shop's own caption readable on a card: first line, no hashtags.
export function cleanCaption(title: string): string {
  const text = title.replace(/#\S+/g, "").replace(/\s+/g, " ").trim();
  return text.length > 90 ? `${text.slice(0, 88).trimEnd()}…` : text;
}

// Server-only: TikTok's public oEmbed endpoint, cached for an hour.
export async function fetchOEmbed(id: string): Promise<OEmbed | null> {
  try {
    const response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl(id))}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) });
    return response.ok ? await response.json() as OEmbed : null;
  } catch {
    return null;
  }
}

export async function getFeaturedVideos(): Promise<TikTokVideo[]> {
  const results = await Promise.all(tiktokVideoIds.map(async (id) => ({ id, meta: await fetchOEmbed(id) })));
  return results.map(({ id, meta }) => ({ id, caption: meta?.title ? cleanCaption(meta.title) : "" }));
}

export function isTikTokImageHost(url: URL): boolean {
  return url.protocol === "https:" && /(^|\.)tiktokcdn(-[a-z]+)?\.com$/.test(url.hostname);
}
