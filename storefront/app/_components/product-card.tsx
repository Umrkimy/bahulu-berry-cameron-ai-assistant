"use client";

import Link from "next/link";
import { money } from "../_lib/content";
import { productCopy, promotionText } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { AddToCartButton } from "./add-to-cart-button";
import { StaggerItem } from "./motion";

const bagIcon = <svg className="shop-card-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>;
const eyeIcon = <svg className="shop-card-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></svg>;

export function ProductCard({ product, headingLevel = "h2" }: { product: StorefrontProduct; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const { locale } = useLocale();
  const text = productCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const discounted = product.sale_price !== null && Number(product.sale_price) < Number(product.price);
  const gallery = [...(product.images ?? [])].sort((a, b) => a.position - b.position);
  const hoverImage = gallery.find((image) => image.image_path !== product.image_path)?.image_path ?? null;
  const href = `/products/${product.id}`;

  return <StaggerItem as="article" className={hoverImage ? "shop-card shop-card-swap" : "shop-card"}>
    <Link className="shop-card-image" href={href} tabIndex={-1} aria-hidden="true">
      <ProductArtwork imagePath={product.image_path} name={name} />
      {hoverImage ? <span className="shop-card-alt"><ProductArtwork imagePath={hoverImage} name={name} decorative /></span> : null}
    </Link>
    <Heading className="shop-card-title"><Link href={href}>{name}</Link></Heading>
    <p className="shop-card-price"><strong>{money(product.sale_price ?? product.price)}</strong>{discounted ? <s aria-label={`${text.regular}: ${money(product.price)}`}>{money(product.price)}</s> : null}</p>
    {product.promotions.length > 0 ? <ul className="catalogue-promotions" aria-label={text.offers}>{product.promotions.map((promotion, i) => <li key={i}>{promotionText(promotion, locale)}</li>)}</ul> : null}
    <div className="shop-card-actions">
      {product.is_available
        ? <AddToCartButton product={product} className="shop-card-action shop-card-add" icon={bagIcon} />
        : <span className="shop-card-unavailable">{text.unavailable}</span>}
      <Link className="shop-card-action" href={href} aria-label={`${text.view}: ${name}`}>{eyeIcon}{text.view}</Link>
    </div>
  </StaggerItem>;
}
