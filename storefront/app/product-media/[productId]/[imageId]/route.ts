import { apiBaseUrl } from "../../../_lib/server-api.ts";

// A versioned URL changes whenever the photo is replaced, so browsers and
// Cloudflare may keep it for a day.
const versioned = "public, max-age=86400";

export async function GET(request: Request, { params }: { params: Promise<{ productId: string; imageId: string }> }) {
  const { productId, imageId } = await params;
  if (![productId, imageId].every(id => /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647)) return new Response(null, { status: 404 });
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/products/${productId}/images/${imageId}/content`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(type)) return new Response(null, { status: response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
    const version = new URL(request.url).searchParams.get("v");
    const cacheControl = version && /^[0-9a-f]{12}$/.test(version) ? versioned : "no-store";
    return new Response(response.body, { headers: { "Content-Type": type, "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
