import { NextResponse } from "next/server";

import { apiBaseUrl, requestClientIpHeaders } from "../../_lib/server-api.ts";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "ms" ? "ms" : "en";
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/place?locale=${locale}`, {
      headers: requestClientIpHeaders(request),
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { detail: "Google information is temporarily unavailable." },
        { status: response.status === 404 ? 404 : 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { detail: "Google information is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
