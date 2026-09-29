"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";

// `named` puts the product and price in the accessible name; the mobile sticky
// bar turns it off because the product name sits right beside the button.
export function AddToCartButton({ product, className = "add-cart-button", quantity = 1, named = true }: { product: StorefrontProduct; className?: string; quantity?: number; named?: boolean }) {
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

  const label = !product.is_available ? text.unavailable : added ? text.addedShort : text.add;
  return <motion.button type="button" className={className} data-added={added || undefined} disabled={!product.is_available}
    whileTap={product.is_available ? { scale: 0.94 } : undefined}
    aria-label={named ? product.is_available ? `${text.add}: ${name}, ${money(displayPrice)}` : `${name}: ${text.unavailable}` : undefined}
    onClick={() => { addItem(product.id, displayPrice, quantity > 1 ? `${name} × ${quantity}: ${text.added}.` : `${name}: ${text.added}.`, quantity); setAdded(true); }}>
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={label} className="add-cart-label" initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}>
        {added ? <svg className="add-cart-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" /></svg> : null}{label}
      </motion.span>
    </AnimatePresence>
  </motion.button>;
}
