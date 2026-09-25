export async function GET(_request: Request, { params }: { params: Promise<{ productId: string; imageId: string }> }) {
  const { productId, imageId } = await params;
  if (![productId, imageId].every(id => /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2147483647)) return new Response(null, { status: 404 });
  const base = (process.env.STOREFRONT_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/storefront/products/${productId}/images/${imageId}/content`, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !["image/jpeg", "image/png", "image/webp"].includes(type)) return new Response(null, { status: response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
    return new Response(response.body, { headers: { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response(null, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
