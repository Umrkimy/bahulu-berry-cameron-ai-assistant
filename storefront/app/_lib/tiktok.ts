import { existsSync } from "node:fs";
import path from "node:path";

import { social, tiktokVideoIds } from "./content.ts";

export type TikTokVideo = { id: string; caption: string; poster?: string };
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

// TikTok's oEmbed stopped returning thumbnails and titles in October 2026, so
// the public video page is read instead. Both are cached for an hour.
export async function fetchVideoMeta(id: string): Promise<OEmbed | null> {
  const oembed = await fetchOEmbed(id);
  if (oembed?.thumbnail_url && oembed.title) return oembed;
  try {
    const response = await fetch(videoUrl(id), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BahuluBerryCameron/1.0)", "Accept-Language": "en" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return oembed;
    const html = await response.text();
    return { thumbnail_url: oembed?.thumbnail_url ?? jsonField(html, "cover"), title: oembed?.title ?? jsonField(html, "desc") };
  } catch {
    return oembed;
  }
}

function jsonField(html: string, key: string): string | undefined {
  const match = html.match(new RegExp(String.raw`"${key}":"((?:[^"\\]|\\.)*)"`));
  if (!match) return undefined;
  try {
    return JSON.parse(`"${match[1]}"`) as string;
  } catch {
    return undefined;
  }
}

export async function getFeaturedVideos(): Promise<TikTokVideo[]> {
  const results = await Promise.all(tiktokVideoIds.map(async (id) => ({ id, meta: await fetchVideoMeta(id) })));
  return results.map(({ id, meta }) => ({ id, caption: meta?.title ? cleanCaption(meta.title) : "", poster: localPoster(id) }));
}

// Cover images saved as public/tiktok/<video id>.webp (or .jpg) take precedence over TikTok's preview.
function localPoster(id: string): string | undefined {
  for (const extension of ["webp", "jpg"]) {
    if (existsSync(path.join(process.cwd(), "public", "tiktok", `${id}.${extension}`))) return `/tiktok/${id}.${extension}`;
  }
  return undefined;
}

export function isTikTokImageHost(url: URL): boolean {
  return url.protocol === "https:" && /(^|\.)tiktokcdn(-[a-z]+)?\.com$/.test(url.hostname);
}
