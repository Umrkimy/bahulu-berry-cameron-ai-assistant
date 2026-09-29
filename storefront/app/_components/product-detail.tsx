"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { money } from "../_lib/content";
import { productCopy, promotionText } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { AddToCartButton } from "./add-to-cart-button";
import { useLocale } from "./locale-provider";
import { Reveal, Stagger } from "./motion";
import { ProductCard } from "./product-card";
import { ProductGallery } from "./product-gallery";
import { QuantityStepper } from "./quantity-stepper";
import { WhatsAppLink } from "./whatsapp-link";

export function ProductDetail({ product, related = [] }: { product: StorefrontProduct; related?: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const discounted = product.sale_price !== null && Number(product.sale_price) < Number(product.price);
  const [quantity, setQuantity] = useState(1);
  const barVisible = usePurchaseBar(product.is_available);

  return <div className="product-concept">
    <div className="detail-topbar"><nav className="shell shop-breadcrumb" aria-label={text.breadcrumb}><Link href="/">{text.home}</Link><span aria-hidden="true">/</span><Link href="/products">{text.products}</Link><span aria-hidden="true">/</span><span aria-current="page">{name}</span></nav></div>
    <section className="shell shop-detail">
      <Reveal y={40}><ProductGallery key={product.id} product={product} /></Reveal>
      <Reveal className="shop-detail-copy" delay={0.12}>
        <h1>{name}</h1>
        <div className="shop-detail-price">
          <span className="sr-only">{text.price}</span><strong>{money(product.sale_price ?? product.price)}</strong>
          {discounted ? <span><span className="sr-only">{text.regular} </span><s>{money(product.price)}</s></span> : null}
          <span className={`stock-label${product.is_available ? "" : " stock-unavailable"}`}><i aria-hidden="true" />{product.is_available ? text.available : text.unavailable}</span>
        </div>
        {product.promotions.length ? <div className="shop-detail-offers"><h2>{text.offers}</h2><ul className="catalogue-promotions">{product.promotions.map((promotion, i) => <li key={i}>{promotionText(promotion, locale)}</li>)}</ul></div> : null}
        <div className="detail-purchase" data-purchase-row>
          {product.is_available ? <QuantityStepper quantity={quantity} name={name} onChange={setQuantity} /> : null}
          <AddToCartButton product={product} quantity={quantity} className="home-button detail-add-cart" />
        </div>
        <WhatsAppLink productName={name} className="home-button home-button-secondary detail-enquire" />
        {description ? <details className="detail-accordion" open>
          <summary><h2>{text.details}</h2><svg className="detail-accordion-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" /></svg></summary>
          <p>{description}</p>
        </details> : null}
      </Reveal>
    </section>
    {related.length ? <section className="shell detail-related" aria-labelledby="detail-related-title">
      <h2 id="detail-related-title">{text.related}</h2>
      <Stagger className="catalogue-grid detail-related-grid">{related.map((item) => <ProductCard key={item.id} product={item} headingLevel="h3" />)}</Stagger>
    </section> : null}
    {product.is_available ? <div className="detail-sticky-bar" data-visible={barVisible || undefined} aria-hidden={!barVisible || undefined} inert={!barVisible || undefined}>
      <div className="detail-sticky-text"><span>{name}</span><strong>{money(product.sale_price ?? product.price)}</strong></div>
      <AddToCartButton product={product} quantity={quantity} named={false} className="home-button detail-sticky-add" />
    </div> : null}
  </div>;
}

// On phones, show a bottom add-to-cart bar whenever the main purchase row is
// off screen, and lift the WhatsApp bubble above it.
function usePurchaseBar(enabled: boolean) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const row = document.querySelector("[data-purchase-row]");
    if (!row) return;
    const phone = window.matchMedia("(max-width: 760px)");
    let offScreen = false;
    const sync = () => setVisible(phone.matches && offScreen);
    const observer = new IntersectionObserver(([entry]) => { offScreen = !entry.isIntersecting; sync(); });
    observer.observe(row);
    phone.addEventListener("change", sync);
    return () => { observer.disconnect(); phone.removeEventListener("change", sync); };
  }, [enabled]);
  useEffect(() => {
    const root = document.documentElement;
    if (visible) root.dataset.stickyBar = "";
    else delete root.dataset.stickyBar;
    return () => { delete root.dataset.stickyBar; };
  }, [visible]);
  return visible;
}
