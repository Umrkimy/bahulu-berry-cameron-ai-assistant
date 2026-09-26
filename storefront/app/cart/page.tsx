import type { Metadata } from "next";

import { CartContent } from "../_components/cart-content";
import { isCheckoutPreviewEnabled } from "../_lib/checkout-preview";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartContent checkoutPreviewEnabled={isCheckoutPreviewEnabled()} />;
}
