import type { Metadata } from "next";

import { CheckoutSuccess } from "../../_components/checkout-result";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccess />;
}
