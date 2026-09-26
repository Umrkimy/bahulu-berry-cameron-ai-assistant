"use client";

import Link from "next/link";

import { MAX_CART_QUANTITY } from "../_lib/cart";
import { cartCopy } from "../_lib/cart-copy";
import { money } from "../_lib/content";
import { promotionText } from "../_lib/product-view";
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
  if (items.length === 0) return <CartShell><div className="cart-empty"><span aria-hidden="true">✳</span><h2>{text.empty}</h2><p>{text.emptyBody}</p><Link className="home-button" href="/products">{text.browse}<span aria-hidden="true">↗</span></Link></div></CartShell>;

  return <CartShell>
    {state === "loading" ? <p className="cart-status" role="status">{text.loading}</p> : null}
    {state === "error" ? <div className="cart-error" role="alert"><p>{text.error}</p><button type="button" className="home-text-link" onClick={retry}>{text.retry}<span aria-hidden="true">↻</span></button></div> : null}
    {quote ? <div className="cart-layout">
      <div className="cart-lines">
        {quote.items.map((line) => {
          const name = (locale === "ms" ? line.name_ms : line.name_en) ?? `Product #${line.product_id}`;
          const issue = line.status === "NOT_AVAILABLE" ? text.noLongerAvailable : line.status === "QUANTITY_UNAVAILABLE" ? text.quantityUnavailable : null;
          return <article className={`cart-line${issue ? " cart-line-issue" : ""}`} key={line.product_id}>
            <div className="cart-line-image"><ProductArtwork imagePath={line.image_path} name={name} /></div>
            <div className="cart-line-main">
              <div className="cart-line-heading"><div><h2>{name}</h2>{changedProductIds.has(line.product_id) ? <span className="price-changed">{text.priceChanged}</span> : null}</div>{line.total_amount ? <strong>{money(line.total_amount)}</strong> : null}</div>
              {line.promotions.length ? <ul className="catalogue-promotions">{line.promotions.map((promotion, index) => <li key={index}>{promotionText(promotion, locale)}</li>)}</ul> : null}
              {issue ? <p className="cart-line-warning" role="alert">{issue}</p> : null}
              <div className="cart-line-actions">
                <div className="quantity-control" aria-label={`${text.quantity}: ${name}`}>
                  <button type="button" onClick={() => updateItem(line.product_id, line.quantity - 1)} aria-label={`${text.decrease}: ${name}`}>−</button>
                  <input type="number" min="1" max={MAX_CART_QUANTITY} value={line.quantity} aria-label={`${text.quantity}: ${name}`} onChange={(event) => updateItem(line.product_id, Number(event.target.value) || 1)} />
                  <button type="button" disabled={line.quantity >= MAX_CART_QUANTITY} onClick={() => updateItem(line.product_id, line.quantity + 1)} aria-label={`${text.increase}: ${name}`}>+</button>
                </div>
                <button type="button" className="cart-remove" onClick={() => removeItem(line.product_id)}>{text.remove}</button>
              </div>
            </div>
          </article>;
        })}
        <button type="button" className="home-text-link cart-clear" onClick={() => { if (window.confirm(text.clearConfirm)) clear(); }}>{text.clear}</button>
      </div>
      <aside className="cart-summary" aria-labelledby="cart-summary-title">
        <h2 id="cart-summary-title">{text.orderSummary}</h2>
        <p className="cart-system-note">{text.currentPricing}</p>
        {quote.ready && quote.subtotal && quote.discount_amount && quote.total_amount ? <dl>
          <div><dt>{text.subtotal}</dt><dd>{money(quote.subtotal)}</dd></div>
          <div><dt>{text.discount}</dt><dd>− {money(quote.discount_amount)}</dd></div>
          <div className="cart-total"><dt>{text.total}</dt><dd>{money(quote.total_amount)}</dd></div>
        </dl> : null}
        {checkoutPreviewEnabled && quote.ready ? <Link className="home-button cart-checkout" href="/checkout">{text.checkout}<span aria-hidden="true">↗</span></Link> : <p className="checkout-disabled">{text.checkoutDisabled}</p>}
      </aside>
    </div> : null}
  </CartShell>;
}

function CartShell({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const text = cartCopy[locale];
  return <div className="cart-concept"><section className="cart-hero"><div className="shell"><p className="home-kicker">{text.eyebrow}</p><h1>{text.title}</h1><p>{text.intro}</p></div></section><section className="shell cart-content">{children}</section></div>;
}
