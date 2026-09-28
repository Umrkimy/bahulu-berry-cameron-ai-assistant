import type { Metadata } from "next";

import { CheckoutCancelled } from "../../_components/checkout-result";

export const metadata: Metadata = { title: "Payment not completed", robots: { index: false, follow: false } };

export default function CheckoutCancelledPage() {
  return <CheckoutCancelled />;
}
