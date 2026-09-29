"use client";

import Link from "next/link";
import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { cartCopy } from "../_lib/cart-copy";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";

export function HeaderCart({ current }: { current: boolean }) {
  const { locale } = useLocale();
  const { count, hydrated } = useCart();
  const [scope, animate] = useAnimate();
  const reduce = useReducedMotion();
  const previous = useRef<number | null>(null);
  const shown = hydrated ? count : 0;

  // Wobble the bag and pop the badge whenever something is added.
  useEffect(() => {
    if (!hydrated) return;
    if (!reduce && previous.current !== null && count > previous.current && scope.current) {
      animate(".cart-icon", { rotate: [0, -16, 12, -8, 4, 0], scale: [1, 1.18, 1] }, { duration: 0.6 });
      // Springs only accept two keyframes, so the three-step pop uses a timed ease.
      animate(".cart-badge", { scale: [1, 1.6, 1] }, { duration: 0.45, ease: ["easeOut", "backOut"], times: [0, 0.4, 1] });
    }
    previous.current = count;
  }, [animate, count, hydrated, reduce, scope]);

  const label = cartCopy[locale].cart;
  return <Link ref={scope} className="header-cart" href="/cart" aria-current={current ? "page" : undefined} aria-label={`${label}: ${shown}`}>
    <motion.svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 11.1a2 2 0 0 1-2 1.9H8.2a2 2 0 0 1-2-1.9L5 8z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></motion.svg>
    {shown > 0 ? <motion.strong className="cart-badge" aria-hidden="true" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>{shown}</motion.strong> : null}
  </Link>;
}
