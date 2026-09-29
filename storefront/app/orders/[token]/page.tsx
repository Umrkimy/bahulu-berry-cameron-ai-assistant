import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrderTrackingPage } from "../../_components/order-tracking";
import { getTrackedOrder } from "../../_lib/api";
import { isCheckoutPreviewEnabled } from "../../_lib/checkout-preview";

export const dynamic = "force-dynamic";
// The token in the URL is the key to the order; never index it or leak it
// to other sites through the Referer header.
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  if (!isCheckoutPreviewEnabled()) notFound();
  const { token } = await params;
  return <OrderTrackingPage result={await getTrackedOrder(token)} />;
}
