import { NextResponse } from "next/server";

const apiBaseUrl = (process.env.STOREFRONT_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: "Invalid cart request." }, { status: 400 }); }

  try {
    const response = await fetch(`${apiBaseUrl}/storefront/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => ({ detail: "Unable to quote the current cart." }));
    return NextResponse.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ detail: "Unable to quote the current cart." }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
