import { NextResponse } from "next/server";

import { isCheckoutPreviewEnabled } from "../../_lib/checkout-preview.ts";
import { apiBaseUrl, requestClientIpHeaders } from "../../_lib/server-api.ts";

const noStore = { "Cache-Control": "no-store" };

// Browsers send Origin on cross-site POSTs; only accept our own pages.
function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isCheckoutPreviewEnabled()) return NextResponse.json({ detail: "Not found." }, { status: 404, headers: noStore });
  if (!isSameOrigin(request)) return NextResponse.json({ detail: "Forbidden." }, { status: 403, headers: noStore });

  const idempotencyKey = request.headers.get("idempotency-key") ?? "";
  if (!/^[A-Za-z0-9-]{16,64}$/.test(idempotencyKey)) {
    return NextResponse.json({ detail: "Invalid checkout request." }, { status: 400, headers: noStore });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: "Invalid checkout request." }, { status: 400, headers: noStore }); }

  try {
    const response = await fetch(`${apiBaseUrl}/storefront/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, ...requestClientIpHeaders(request) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => ({ detail: "Unable to start checkout." }));
    return NextResponse.json(payload, { status: response.status, headers: noStore });
  } catch {
    return NextResponse.json({ detail: "Unable to start checkout." }, { status: 503, headers: noStore });
  }
}
