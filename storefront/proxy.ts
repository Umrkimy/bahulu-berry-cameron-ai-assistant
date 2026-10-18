import { NextResponse, type NextRequest } from "next/server";

import { isCheckoutPreviewEnabled } from "./app/_lib/checkout-preview";
import { comingSoonHeader, decideGate, isComingSoonEnabled, previewCookieMaxAge, previewCookieName, previewKey, previewToken } from "./app/_lib/coming-soon";
import { buildContentSecurityPolicy, createNonce } from "./app/_lib/csp";

const noIndex = "noindex, nofollow";

function notFound() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": noIndex,
    },
  });
}

function isDataPath(pathname: string) {
  return pathname.startsWith("/storefront-data") || pathname === "/sitemap.xml";
}

function withPolicy(request: NextRequest, rewriteTo?: URL) {
  const policy = buildContentSecurityPolicy(createNonce(), process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(comingSoonHeader);
  requestHeaders.set("Content-Security-Policy", policy);
  if (rewriteTo) requestHeaders.set(comingSoonHeader, "1");
  const init = { request: { headers: requestHeaders } };
  const response = rewriteTo ? NextResponse.rewrite(rewriteTo, init) : NextResponse.next(init);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const comingSoon = isComingSoonEnabled();

  if (comingSoon) {
    const key = previewKey();
    const decision = await decideGate(pathname, searchParams.get("key"), request.cookies.get(previewCookieName)?.value, key);
    if (decision === "not-found") return notFound();
    if (decision === "coming-soon") {
      const response = withPolicy(request, new URL("/coming-soon", request.url));
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("X-Robots-Tag", noIndex);
      return response;
    }
    if (decision === "grant" && key) {
      const home = request.nextUrl.clone();
      home.pathname = "/";
      home.search = "";
      const response = NextResponse.redirect(home);
      response.cookies.set(previewCookieName, await previewToken(key), {
        httpOnly: true,
        sameSite: "lax",
        secure: request.headers.get("x-forwarded-proto") === "https" || request.nextUrl.protocol === "https:",
        path: "/",
        maxAge: previewCookieMaxAge,
      });
      response.headers.set("Cache-Control", "no-store");
      response.headers.set("Referrer-Policy", "no-referrer");
      return response;
    }
  }

  if (pathname === "/coming-soon" && !comingSoon) return notFound();
  if (pathname === "/checkout" && !isCheckoutPreviewEnabled()) return notFound();

  const response = isDataPath(pathname) ? NextResponse.next() : withPolicy(request);
  if (comingSoon) response.headers.set("X-Robots-Tag", noIndex);
  return response;
}

// Static files and product photos skip the proxy; pages and data routes go through it.
export const config = {
  matcher: ["/((?!_next/static|_next/image|product-media|concept/|favicon.ico|robots.txt).*)"],
};
