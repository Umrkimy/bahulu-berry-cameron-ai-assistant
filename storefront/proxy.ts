import { NextResponse, type NextRequest } from "next/server";

import { isCheckoutPreviewEnabled } from "./app/_lib/checkout-preview";
import { buildContentSecurityPolicy, createNonce } from "./app/_lib/csp";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/checkout" && !isCheckoutPreviewEnabled()) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const policy = buildContentSecurityPolicy(createNonce(), process.env.NODE_ENV === "development");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

// Pages only: static files, images and the JSON/data routes need no script policy.
export const config = {
  matcher: ["/((?!_next/static|_next/image|storefront-data|product-media|concept/|favicon.ico|robots.txt|sitemap.xml).*)"],
};
