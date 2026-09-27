import { NextResponse } from "next/server";

const apiBaseUrl = (process.env.STOREFRONT_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") === "ms" ? "ms" : "en";
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/place?locale=${locale}`, {
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
