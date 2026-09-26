import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutContent } from "../_components/checkout-content";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Private checkout preview", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  if (process.env.STOREFRONT_CHECKOUT_PREVIEW_ENABLED !== "true") notFound();
  return <CheckoutContent />;
}
