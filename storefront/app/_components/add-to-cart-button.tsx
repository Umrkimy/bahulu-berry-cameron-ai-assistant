"use client";

import { useEffect, useState } from "react";

import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";

export function AddToCartButton({ product, className = "add-cart-button" }: { product: StorefrontProduct; className?: string }) {
  const { locale } = useLocale();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const text = cartCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const displayPrice = product.sale_price ?? product.price;

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1800);
    return () => window.clearTimeout(timer);
  }, [added]);

  return <button type="button" className={className} data-added={added || undefined} disabled={!product.is_available}
    aria-label={product.is_available ? `${text.add}: ${name}, ${money(displayPrice)}` : `${name}: ${text.unavailable}`}
    onClick={() => { addItem(product.id, displayPrice, `${name}: ${text.added}.`); setAdded(true); }}>
    {!product.is_available ? text.unavailable : added ? text.addedShort : text.add}
  </button>;
}
