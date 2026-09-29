"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";

import { cartCount } from "../_lib/cart";
import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import { promotionText } from "../_lib/product-view";
import type { StorefrontQuote } from "../_lib/types";
import { orderMessage, whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { QuantityStepper } from "./quantity-stepper";
import { useCartQuote } from "./use-cart-quote";

export function CartContent({ checkoutPreviewEnabled }: { checkoutPreviewEnabled: boolean }) {
  const { locale } = useLocale();
  const { items, hydrated, changedProductIds, updateItem, removeItem, clear } = useCart();
  const { quote, state, retry } = useCartQuote();
  const text = cartCopy[locale];

  if (!hydrated) return <CartShell><p className="cart-status" role="status">{text.loading}</p></CartShell>;
  if (items.length === 0) return <CartShell><div className="cart-empty">
    <Image src="/concept/brand-preview.webp" alt="" width={200} height={200} className="cart-empty-mascot" />
    <h2>{text.empty}</h2><p>{text.emptyBody}</p><Link className="home-button" href="/products">{text.browse}</Link>
  </div></CartShell>;

  const hasDiscount = Number(quote?.discount_amount ?? 0) > 0;
  const count = cartCount(items);

  return <CartShell count={`${count} ${count === 1 ? text.item : text.items}`}>
    {state === "loading" && !quote ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}</button></div> : null}
    {quote ? <div className="cart-layout">
      <section className="cart-lines" aria-label={text.title}>
        <div className="cart-table-head" aria-hidden="true"><span>{text.itemColumn}</span><span>{text.quantity}</span><span>{text.total}</span></div>
        <AnimatePresence initial={false}>{quote.items.map((line) => {
          const name = (locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`;
          const issue = line.status === "NOT_AVAILABLE" ? text.noLongerAvailable : line.status === "QUANTITY_UNAVAILABLE" ? text.quantityUnavailable : null;
          const setQuantity = (quantity: number) => updateItem(line.product_id, quantity, `${name}: ${text.quantityUpdated} ${quantity}.`);
          const onSale = line.unit_price && line.display_price && Number(line.display_price) < Number(line.unit_price);
          const lineDiscounted = line.subtotal && line.total_amount && Number(line.total_amount) < Number(line.subtotal);
          return <motion.article layout="position" className={`cart-line${issue ? " cart-line-issue" : ""}`} key={line.product_id}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -32, transition: { duration: 0.2 } }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            <Link className="cart-line-image" href={`/products/${line.product_id}`} tabIndex={-1} aria-hidden="true"><ProductArtwork imagePath={line.image_path} name={name} /></Link>
            <div className="cart-line-info">
              <h2><Link href={`/products/${line.product_id}`}>{name}</Link></h2>
              {line.display_price ? <p className="cart-line-unit"><span>{money(line.display_price)}</span>{onSale ? <s>{money(line.unit_price!)}</s> : null} <span>{text.each}</span></p> : null}
              {changedProductIds.has(line.product_id) ? <span className="price-changed">{text.priceChanged}</span> : null}
              {line.promotions.length ? <ul className="catalogue-promotions">{line.promotions.map((promotion, index) => <li key={index}>{promotionText(promotion, locale)}</li>)}</ul> : null}
              {issue ? <p className="cart-line-warning" role="alert">{issue}</p> : null}
            </div>
            <QuantityStepper className="cart-line-quantity" quantity={line.quantity} name={name} onChange={setQuantity} />
            <p className="cart-line-total">
              <span className="sr-only">{text.total}: </span>
              {line.total_amount ? <strong>{money(line.total_amount)}</strong> : <strong>—</strong>}
              {lineDiscounted ? <s>{money(line.subtotal!)}</s> : null}
            </p>
            <button type="button" className="cart-remove" aria-label={`${text.remove}: ${name}`} title={text.removeItem} onClick={() => removeItem(line.product_id, `${name}: ${text.removed}.`)}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" /></svg>
            </button>
          </motion.article>;
        })}</AnimatePresence>
        <div className="cart-lines-foot">
          <Link className="home-text-link" href="/products"><span aria-hidden="true">←</span>{text.continueShopping}</Link>
          <button type="button" className="cart-clear" onClick={() => { if (window.confirm(text.clearConfirm)) clear(`${text.cleared}.`); }}>{text.clear}</button>
        </div>
      </section>
      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">{text.orderSummary}</h2>
        {quote.ready && quote.subtotal && quote.total_amount ? <dl>
          <div><dt>{text.subtotal}</dt><dd>{money(quote.subtotal)}</dd></div>
          {hasDiscount && quote.discount_amount ? <div className="cart-discount"><dt>{text.discount}</dt><dd>− {money(quote.discount_amount)}</dd></div> : null}
          <div className="cart-total"><dt>{text.total}</dt><dd>{money(quote.total_amount)}</dd></div>
        </dl> : <p className="cart-line-warning">{text.quantityUnavailable}</p>}
        <OrderActions quote={quote} checkoutPreviewEnabled={checkoutPreviewEnabled} />
      </aside>
    </div> : null}
  </CartShell>;
}

function OrderActions({ quote, checkoutPreviewEnabled }: { quote: StorefrontQuote; checkoutPreviewEnabled: boolean }) {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  const number = whatsAppNumber();
  const ready = quote.ready && Boolean(quote.total_amount);

  if (!number && !checkoutPreviewEnabled) return <p className="cart-note">{text.orderingClosed}</p>;
  if (!ready) return null;

  const message = orderMessage(
    text.orderGreeting,
    quote.items.map((line) => ({ name: (locale === "ms" ? line.name_ms : line.name_en) ?? `#${line.product_id}`, quantity: line.quantity, total: money(line.total_amount ?? "0") })),
    text.total,
    money(quote.total_amount ?? "0"),
  );

  // WhatsApp stays the primary route until online payment is approved.
  return <div className="cart-actions">
    {number ? <>
      <a className="home-button cart-checkout" href={whatsAppUrl(number, message)} target="_blank" rel="noreferrer">{text.orderOnWhatsApp}<span aria-hidden="true">↗</span></a>
      <p className="cart-note">{text.whatsAppNote}</p>
    </> : null}
    {checkoutPreviewEnabled ? <Link className={number ? "home-button home-button-secondary cart-checkout" : "home-button cart-checkout"} href="/checkout">{text.checkout}</Link> : null}
  </div>;
}

function CartShell({ children, count }: { children: React.ReactNode; count?: string }) {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  return <div className="cart-concept">
    <section className="cart-hero"><div className="shell cart-hero-inner"><h1>{text.title}</h1>{count ? <p className="cart-count">{count}</p> : null}</div></section>
    <section className="shell cart-content">{children}</section>
  </div>;
}
