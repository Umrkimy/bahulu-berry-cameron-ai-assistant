import { fetchOEmbed, isFeaturedVideo, isTikTokImageHost } from "../../../_lib/tiktok.ts";

// Proxies the preview image so visitors do not contact TikTok until they press play.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isFeaturedVideo(id)) return new Response("Not found", { status: 404 });
  const meta = await fetchOEmbed(id);
  let source: URL;
  try { source = new URL(meta?.thumbnail_url ?? ""); } catch { return unavailable(); }
  if (!isTikTokImageHost(source)) return unavailable();
  try {
    const image = await fetch(source, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
    const type = image.headers.get("content-type") ?? "";
    if (!image.ok || !/^image\/(jpeg|png|webp|avif)$/.test(type.split(";")[0])) return unavailable();
    return new Response(image.body, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return unavailable();
  }
}

function unavailable() {
  return new Response("Preview unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
}
