import { NextResponse, type NextRequest } from "next/server";

import { CUSTOMER_COOKIE, findAccountRoute, isAccountsEnabled, sessionCookie } from "../../../_lib/accounts.ts";
import { apiBaseUrl, isSameOrigin, requestClientIpHeaders } from "../../../_lib/server-api.ts";

const noStore = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 4096;
type Context = { params: Promise<{ path: string[] }> };

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStore });
}

// Forwards an allowlisted account call to the API. The session token lives
// only in an HttpOnly cookie here and travels to the API as a bearer header.
async function forward(request: NextRequest, context: Context) {
  if (!isAccountsEnabled()) return json({ detail: "Not found." }, 404);
  const route = findAccountRoute(request.method, (await context.params).path);
  if (!route) return json({ detail: "Not found." }, 404);
  if (request.method !== "GET" && !isSameOrigin(request)) return json({ detail: "Forbidden." }, 403);

  const token = request.cookies.get(CUSTOMER_COOKIE)?.value;
  // Checking whether someone is signed in is not an error for visitors.
  if (route.path === "/me" && request.method === "GET" && !token) return json(null, 200);
  if (route.auth && !token) return json({ detail: "Please sign in." }, 401);

  let body: string | undefined;
  if (request.method !== "GET") {
    body = await request.text();
    if (body.length > MAX_BODY_BYTES) return json({ detail: "Request is too large." }, 413);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/storefront/account${route.path}`, {
      method: request.method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(route.auth && token ? { Authorization: `Bearer ${token}` } : {}),
        ...requestClientIpHeaders(request),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    return json({ detail: "The account service is unavailable." }, 503);
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    // Validation details from the API are not shown to customers; the page
    // explains each failure in the visitor's language from the status code.
    const result = json({ detail: typeof payload?.detail === "string" ? payload.detail : "Request failed." }, response.status);
    if (response.status === 401 && route.auth) result.cookies.delete(CUSTOMER_COOKIE);
    return result;
  }

  if (route.session === "set" && payload?.session_token) {
    const result = json(payload.account, 200);
    result.cookies.set(sessionCookie(payload.session_token, payload.expires_at));
    return result;
  }
  if (route.session === "clear") {
    const result = new NextResponse(null, { status: 204, headers: noStore });
    result.cookies.delete(CUSTOMER_COOKIE);
    return result;
  }
  if (route.download) {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: { ...noStore, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="bahulu-berry-cameron-my-data.json"' },
    });
  }
  return json(payload, response.status);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
