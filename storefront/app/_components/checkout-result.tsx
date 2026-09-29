"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { cartCopy } from "../_lib/cart-copy";
import { PENDING_CHECKOUT_KEY } from "../_lib/checkout";
import { isTrackingToken } from "../_lib/order-tracking";
import { trackingCopy } from "../_lib/tracking-copy";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";

// The redirect back from the payment page proves nothing; the order is only
// marked paid by the provider's signed webhook. This page just says thanks.
function readPending(): string | null {
  try { return sessionStorage.getItem(PENDING_CHECKOUT_KEY); } catch { return null; }
}

const noSubscription = () => () => {};

export function CheckoutSuccess() {
  const { locale } = useLocale();
  const { clear } = useCart();
  const text = cartCopy[locale];
  const tracking = trackingCopy[locale];
  const pending = useSyncExternalStore(noSubscription, readPending, () => null);
  let orderNumber: number | null = null;
  let trackingToken: string | null = null;
  let cartCleared = false;
  try {
    const parsed = pending ? JSON.parse(pending) as { orderNumber?: unknown; trackingToken?: unknown; cartCleared?: unknown } : {};
    if (typeof parsed.orderNumber === "number") orderNumber = parsed.orderNumber;
    if (typeof parsed.trackingToken === "string" && isTrackingToken(parsed.trackingToken)) trackingToken = parsed.trackingToken;
    cartCleared = parsed.cartCleared === true;
  } catch { /* ignore a malformed marker */ }

  useEffect(() => {
    // Only a checkout started in this tab empties the cart, and only once.
    if (!pending || cartCleared) return;
    clear(text.cleared);
    try { sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ orderNumber, trackingToken, cartCleared: true })); } catch { /* optional */ }
  }, [pending, cartCleared, clear, text.cleared, orderNumber, trackingToken]);

  return <ResultShell title={text.successTitle} body={text.successBody}>
    {orderNumber ? <p className="checkout-order-number"><span>{text.orderNumber}</span><strong>#{orderNumber}</strong></p> : null}
    {trackingToken ? <>
      <Link href={`/orders/${trackingToken}`} className="home-button">{tracking.trackOrder}</Link>
      <p>{tracking.trackHint}</p>
    </> : <Link href="/orders/find" className="home-text-link">{tracking.findTitle}</Link>}
    <p>{text.successHelp}</p>
    <Link href="/products" className={trackingToken ? "home-text-link" : "home-button"}>{text.continueShopping}</Link>
  </ResultShell>;
}

export function CheckoutCancelled() {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  return <ResultShell title={text.cancelTitle} body={text.cancelBody}>
    <Link href="/cart" className="home-button">{text.backCart}</Link>
  </ResultShell>;
}

function ResultShell({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return <div className="checkout-concept"><section className="cart-hero"><div className="shell"><h1>{title}</h1><p>{body}</p></div></section>
    <section className="shell checkout-content checkout-result">{children}</section></div>;
}
