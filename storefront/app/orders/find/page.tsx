import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FindOrder } from "../../_components/order-tracking";
import { isCheckoutPreviewEnabled } from "../../_lib/checkout-preview";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find my order", robots: { index: false, follow: false } };

export default function FindOrderPage() {
  if (!isCheckoutPreviewEnabled()) notFound();
  return <FindOrder />;
}
