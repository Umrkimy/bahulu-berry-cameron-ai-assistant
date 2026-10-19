"use client";

import Link from "next/link";
import { money } from "../_lib/content";
import { productCopy, promotionText } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { ProductArtwork } from "./product-artwork";
import { AddToCartButton } from "./add-to-cart-button";
import { StaggerItem } from "./motion";

export function ProductCard({ product, headingLevel = "h2" }: { product: StorefrontProduct; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const { locale } = useLocale();
  const text = productCopy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const discounted = product.sale_price !== null && Number(product.sale_price) < Number(product.price);
  const altPhoto = secondPhoto(product);
  return <StaggerItem as="article" className={altPhoto ? "catalogue-card has-alt-photo" : "catalogue-card"}>
    <Link className="catalogue-card-image" href={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
      <ProductArtwork imagePath={product.image_path} name={name} />
      {altPhoto ? <span className="card-alt-photo"><ProductArtwork imagePath={altPhoto} name={name} decorative /></span> : null}
    </Link>
    <div className="catalogue-card-meta">{product.category ? <span className="catalogue-card-category">{product.category}</span> : null}<span className={`stock-label${product.is_available ? "" : " stock-unavailable"}`}><i aria-hidden="true" />{product.is_available ? text.available : text.unavailable}</span></div>
    <Heading><Link href={`/products/${product.id}`}>{name}</Link></Heading>
    {description ? <p className="catalogue-card-description">{description}</p> : null}
    {product.promotions.length > 0 ? <ul className="catalogue-promotions" aria-label={text.offers}>{product.promotions.map((promotion, i) => <li key={i}>{promotionText(promotion, locale)}</li>)}</ul> : null}
    <div className="catalogue-card-bottom"><div><strong>{money(product.sale_price ?? product.price)}</strong>{discounted ? <s aria-label={`${text.regular}: ${money(product.price)}`}>{money(product.price)}</s> : null}</div><AddToCartButton product={product} /></div>
  </StaggerItem>;
}

// The hover photo is the next gallery photo after the cover, when the product has one.
export function secondPhoto(product: StorefrontProduct): string | null {
  const gallery = [...(product.images ?? [])].sort((a, b) => a.position - b.position);
  return gallery.find((image) => image.image_path !== product.image_path)?.image_path ?? null;
}
