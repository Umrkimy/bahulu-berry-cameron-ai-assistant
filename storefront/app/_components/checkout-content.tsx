"use client";

import Link from "next/link";

import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";
import { useCartQuote } from "./use-cart-quote";

export function CheckoutContent() {
  const { locale } = useLocale();
  const { items, hydrated } = useCart();
  const { quote, state, retry } = useCartQuote();
  const text = cartCopy[locale];

  return <div className="checkout-concept"><section className="cart-hero"><div className="shell"><p className="home-kicker">{text.fictional}</p><h1>{text.checkoutTitle}</h1><p>{text.checkoutIntro}</p></div></section><section className="shell checkout-content">
    <div className="preview-warning" role="note"><strong>{text.fictional}</strong><p>{text.fictionalBody}</p></div>
    {!hydrated || state === "loading" ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}</button></div> : null}
    {hydrated && items.length === 0 ? <div className="cart-empty"><h2>{text.empty}</h2><Link href="/products" className="home-button">{text.browse}<span aria-hidden="true">↗</span></Link></div> : null}
    {quote ? <div className="checkout-grid">
      <section className="checkout-panel"><h2>{text.orderSummary}</h2><ul className="checkout-items">{quote.items.map((line) => <li key={line.product_id}><span>{(locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`} × {line.quantity}</span><strong>{line.total_amount ? money(line.total_amount) : "—"}</strong></li>)}</ul>{quote.ready && quote.total_amount ? <p className="checkout-total"><span>{text.total}</span><strong>{money(quote.total_amount)}</strong></p> : <p className="cart-line-warning">{text.quantityUnavailable}</p>}</section>
      <section className="checkout-panel"><span className="checkout-step" aria-hidden="true">01</span><h2>{text.fulfilment}</h2><p>{text.fulfilmentBody}</p></section>
      <section className="checkout-panel"><span className="checkout-step" aria-hidden="true">02</span><h2>{text.payment}</h2><p>{text.paymentBody}</p><button type="button" disabled className="home-button">{text.noSubmission}</button></section>
    </div> : null}
    <Link href="/cart" className="home-text-link checkout-back">← {text.backCart}</Link>
  </section></div>;
}
