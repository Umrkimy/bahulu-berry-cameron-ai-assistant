"use client";

import Link from "next/link";
import { money } from "../_lib/content";
import { productCopy, promotionText } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductGallery } from "./product-gallery";
import { WhatsAppLink } from "./whatsapp-link";
import { AddToCartButton } from "./add-to-cart-button";

export function ProductDetail({ product }: { product: StorefrontProduct }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const discounted = product.sale_price !== null && Number(product.sale_price) < Number(product.price);

  return <div className="product-concept">
    <div className="detail-topbar"><nav className="shell shop-breadcrumb" aria-label={text.breadcrumb}><Link href="/">{text.home}</Link><span aria-hidden="true">/</span><Link href="/products">{text.products}</Link><span aria-hidden="true">/</span><span aria-current="page">{name}</span></nav></div>
    <section className="shell shop-detail">
      <ProductGallery key={product.id} product={product} />
      <div className="shop-detail-copy">
        <h1>{name}</h1>
        <span className={`stock-label${product.is_available ? "" : " stock-unavailable"}`}><i aria-hidden="true" />{product.is_available ? text.available : text.unavailable}</span>
        <div className="shop-detail-price"><span className="sr-only">{text.price}</span><strong>{money(product.sale_price ?? product.price)}</strong>{discounted ? <span><span className="sr-only">{text.regular} </span><s>{money(product.price)}</s></span> : null}</div>
        {product.promotions.length ? <div className="shop-detail-offers"><h2>{text.offers}</h2><ul className="catalogue-promotions">{product.promotions.map((promotion, i) => <li key={i}>{promotionText(promotion, locale)}</li>)}</ul></div> : null}
        <AddToCartButton product={product} className="home-button detail-add-cart" />
        <WhatsAppLink productName={name} className="home-button home-button-secondary detail-enquire" />
        {description ? <div className="shop-detail-description"><h2>{text.details}</h2><p>{description}</p></div> : null}
      </div>
    </section>
  </div>;
}
