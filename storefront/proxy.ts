import { NextResponse } from "next/server";

import { isCheckoutPreviewEnabled } from "./app/_lib/checkout-preview";

export function proxy() {
  if (!isCheckoutPreviewEnabled()) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  return NextResponse.next();
}

export const config = { matcher: "/checkout" };
