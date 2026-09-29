import { NextResponse } from "next/server";

import { isCheckoutPreviewEnabled } from "../../../_lib/checkout-preview.ts";
import { apiBaseUrl, isSameOrigin, requestClientIpHeaders } from "../../../_lib/server-api.ts";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isCheckoutPreviewEnabled()) return NextResponse.json({ detail: "Not found." }, { status: 404, headers: noStore });
  if (!isSameOrigin(request)) return NextResponse.json({ detail: "Forbidden." }, { status: 403, headers: noStore });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: "Invalid request." }, { status: 400, headers: noStore }); }

  try {
    const response = await fetch(`${apiBaseUrl}/storefront/orders/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...requestClientIpHeaders(request) },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({ detail: "Unable to find the order." }));
    return NextResponse.json(payload, { status: response.status, headers: noStore });
  } catch {
    return NextResponse.json({ detail: "Unable to find the order." }, { status: 503, headers: noStore });
  }
}
