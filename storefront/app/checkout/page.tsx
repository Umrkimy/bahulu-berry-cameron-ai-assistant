import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutContent } from "../_components/checkout-content";
import { isCheckoutPreviewEnabled } from "../_lib/checkout-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private checkout preview", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  if (!isCheckoutPreviewEnabled()) notFound();
  return <CheckoutContent />;
}
