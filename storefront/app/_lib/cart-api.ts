import type { CartItem } from "./cart";
import type { StorefrontQuote } from "./types";

export async function quoteCart(items: CartItem[], signal?: AbortSignal): Promise<StorefrontQuote> {
  const response = await fetch("/storefront-data/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })) }),
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Unable to quote the current cart.");
  return response.json() as Promise<StorefrontQuote>;
}
