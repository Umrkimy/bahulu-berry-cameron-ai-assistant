"use client";

import Link from "next/link";
import { money } from "../_lib/content";
import { productCopy, promotionText } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { AddToCartButton } from "./add-to-cart-button";

export function ProductCard({ product, index = 0 }: { product: StorefrontProduct; index?: number }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const discounted = product.sale_price !== null && Number(product.sale_price) < Number(product.price);
  return <article className="catalogue-card">
    <Link className="catalogue-card-image" href={`/products/${product.id}`} aria-label={`${text.view}: ${name}`}>
      <span className="catalogue-card-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <ProductArtwork imagePath={product.image_path} name={name} />
      <span className="catalogue-card-arrow" aria-hidden="true">↗</span>
    </Link>
    <div className="catalogue-card-meta"><span>{product.category}</span><span className={`stock-label${product.is_available ? "" : " stock-unavailable"}`}><i aria-hidden="true" />{product.is_available ? text.available : text.unavailable}</span></div>
    <h2><Link href={`/products/${product.id}`}>{name}</Link></h2>
    {description ? <p className="catalogue-card-description">{description}</p> : null}
    {product.promotions.length > 0 ? <ul className="catalogue-promotions" aria-label={text.offers}>{product.promotions.map((promotion, i) => <li key={i}>{promotionText(promotion, locale)}</li>)}</ul> : null}
    <div className="catalogue-card-bottom"><div><strong>{money(product.sale_price ?? product.price)}</strong>{discounted ? <s aria-label={`${text.regular}: ${money(product.price)}`}>{money(product.price)}</s> : null}</div><Link href={`/products/${product.id}`} aria-label={`${text.view}: ${name}`}>{text.view}<span aria-hidden="true">↗</span></Link></div>
    <AddToCartButton product={product} />
  </article>;
}
