import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutContent } from "../_components/checkout-content";
import type { CheckoutStatus } from "../_lib/checkout";
import { isCheckoutPreviewEnabled } from "../_lib/checkout-preview";
import { apiBaseUrl } from "../_lib/server-api";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

// The API decides whether real (test-mode) checkout is on; if it can't be
// reached the page falls back to the review-only preview.
async function checkoutStatus(): Promise<CheckoutStatus> {
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/checkout/status`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { enabled: false, test_mode: true };
    return await response.json() as CheckoutStatus;
  } catch {
    return { enabled: false, test_mode: true };
  }
}

export default async function CheckoutPage() {
  if (!isCheckoutPreviewEnabled()) notFound();
  return <CheckoutContent status={await checkoutStatus()} />;
}
