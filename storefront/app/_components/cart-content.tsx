"use client";

import Link from "next/link";
import { useState } from "react";

import { MAX_CART_QUANTITY } from "../_lib/cart";
import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import { promotionText } from "../_lib/product-view";
import type { StorefrontQuote } from "../_lib/types";
import { orderMessage, whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { useCartQuote } from "./use-cart-quote";

export function CartContent({ checkoutPreviewEnabled }: { checkoutPreviewEnabled: boolean }) {
  const { locale } = useLocale();
  const { items, hydrated, changedProductIds, updateItem, removeItem, clear } = useCart();
  const { quote, state, retry } = useCartQuote();
  const text = cartCopy[locale];

  if (!hydrated) return <CartShell><p className="cart-status" role="status">{text.loading}</p></CartShell>;
  if (items.length === 0) return <CartShell><div className="cart-empty"><h2>{text.empty}</h2><p>{text.emptyBody}</p><Link className="home-button" href="/products">{text.browse}</Link></div></CartShell>;

  const hasDiscount = Number(quote?.discount_amount ?? 0) > 0;

  return <CartShell>
    {state === "loading" ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}</button></div> : null}
    {quote ? <div className="cart-layout">
      <div className="cart-lines">
        {quote.items.map((line) => {
          const name = (locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`;
          const issue = line.status === "NOT_AVAILABLE" ? text.noLongerAvailable : line.status === "QUANTITY_UNAVAILABLE" ? text.quantityUnavailable : null;
          const setQuantity = (quantity: number) => updateItem(line.product_id, quantity, `${name}: ${text.quantityUpdated} ${quantity}.`);
          return <article className={`cart-line${issue ? " cart-line-issue" : ""}`} key={line.product_id}>
            <div className="cart-line-image"><ProductArtwork imagePath={line.image_path} name={name} /></div>
            <div className="cart-line-main">
              <div className="cart-line-heading"><div><h2>{name}</h2>{changedProductIds.has(line.product_id) ? <span className="price-changed">{text.priceChanged}</span> : null}</div>{line.total_amount ? <strong>{money(line.total_amount)}</strong> : null}</div>
              {line.promotions.length ? <ul className="catalogue-promotions">{line.promotions.map((promotion, index) => <li key={index}>{promotionText(promotion, locale)}</li>)}</ul> : null}
              {issue ? <p className="cart-line-warning" role="alert">{issue}</p> : null}
              <div className="cart-line-actions">
                <div className="quantity-control" role="group" aria-label={`${text.quantity}: ${name}`}>
                  <button type="button" disabled={line.quantity <= 1} onClick={() => setQuantity(line.quantity - 1)} aria-label={`${text.decrease}: ${name}`}>−</button>
                  <QuantityInput key={line.quantity} quantity={line.quantity} label={`${text.quantity}: ${name}`} rangeHint={`${text.quantityRange} ${MAX_CART_QUANTITY}.`} onCommit={setQuantity} />
                  <button type="button" disabled={line.quantity >= MAX_CART_QUANTITY} onClick={() => setQuantity(line.quantity + 1)} aria-label={`${text.increase}: ${name}`}>+</button>
                </div>
                <button type="button" className="cart-remove" onClick={() => removeItem(line.product_id, `${name}: ${text.removed}.`)}>{text.remove}</button>
              </div>
            </div>
          </article>;
        })}
        <button type="button" className="cart-clear" onClick={() => { if (window.confirm(text.clearConfirm)) clear(`${text.cleared}.`); }}>{text.clear}</button>
      </div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">{text.orderSummary}</h2>
        {quote.ready && quote.subtotal && quote.total_amount ? <dl>
          {hasDiscount ? <div><dt>{text.subtotal}</dt><dd>{money(quote.subtotal)}</dd></div> : null}
          {hasDiscount && quote.discount_amount ? <div><dt>{text.discount}</dt><dd>− {money(quote.discount_amount)}</dd></div> : null}
          <div className="cart-total"><dt>{text.total}</dt><dd>{money(quote.total_amount)}</dd></div>
        </dl> : null}
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

  return <div className="cart-actions">
    {number ? <>
      <a className="home-button cart-checkout" href={whatsAppUrl(number, message)} target="_blank" rel="noreferrer">{text.orderOnWhatsApp}<span aria-hidden="true">↗</span></a>
      <p className="cart-note">{text.whatsAppNote}</p>
    </> : null}
    {checkoutPreviewEnabled ? <Link className="home-text-link" href="/checkout">{text.checkout}</Link> : null}
  </div>;
}

function QuantityInput({ quantity, label, rangeHint, onCommit }: { quantity: number; label: string; rangeHint: string; onCommit: (quantity: number) => void }) {
  const [draft, setDraft] = useState(String(quantity));
  const value = Number(draft);
  const valid = Number.isInteger(value) && value >= 1 && value <= MAX_CART_QUANTITY;
  const commit = () => {
    if (valid && value !== quantity) onCommit(value);
    else if (!valid) setDraft(String(quantity));
  };
  return <>
    <input type="number" inputMode="numeric" min="1" max={MAX_CART_QUANTITY} value={draft} aria-label={label} aria-invalid={!valid || undefined}
      onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); }} />
    {valid ? null : <span className="quantity-hint" role="alert">{rangeHint}</span>}
  </>;
}

function CartShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  return <div className="cart-concept"><section className="cart-hero"><div className="shell"><h1>{text.title}</h1></div></section><section className="shell cart-content">{children}</section></div>;
}
