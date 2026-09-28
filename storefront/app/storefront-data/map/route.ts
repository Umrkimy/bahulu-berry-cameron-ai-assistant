import { NextResponse } from "next/server";

import { apiBaseUrl, requestClientIpHeaders } from "../../_lib/server-api.ts";

function isApprovedEmbedUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "www.google.com" && url.pathname === "/maps/embed/v1/place";
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "ms" ? "ms" : "en";
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/map?locale=${locale}`, {
      headers: requestClientIpHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    const payload = response.ok ? await response.json() as { embed_url?: unknown } : null;
    if (!payload || !isApprovedEmbedUrl(payload.embed_url)) {
      return NextResponse.json(
        { detail: "Map is temporarily unavailable." },
        { status: response.status === 404 ? 404 : 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    const redirect = NextResponse.redirect(payload.embed_url);
    redirect.headers.set("Cache-Control", "no-store");
    return redirect;
  } catch {
    return NextResponse.json(
      { detail: "Map is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
