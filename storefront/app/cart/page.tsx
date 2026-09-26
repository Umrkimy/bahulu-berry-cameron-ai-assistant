import type { Metadata } from "next";

import { CartContent } from "../_components/cart-content";

export const metadata: Metadata = { title: "Cart", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartContent checkoutPreviewEnabled={process.env.STOREFRONT_CHECKOUT_PREVIEW_ENABLED === "true"} />;
}
