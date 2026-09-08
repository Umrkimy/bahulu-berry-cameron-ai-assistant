"use client";

import Image from "next/image";
import Link from "next/link";

import { copy, money } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { WhatsAppLink } from "./whatsapp-link";

const assetOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");

export function ProductDetail({ product }: { product: StorefrontProduct }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const imageSource = product.image_path ? `${assetOrigin}${product.image_path}` : null;
  return <section className="shell product-detail"><Link href="/products" className="back-link">← {text.back}</Link><div className="product-detail-grid"><div className="detail-image">{imageSource ? <Image src={imageSource} alt={name} fill sizes="(max-width: 800px) 100vw, 50vw" priority /> : <span>{text.imagePending}</span>}</div><div><p className="eyebrow">{product.category ?? "Bahulu Berry Cameron"}</p><h1>{name}</h1><span className={product.is_available ? "availability" : "availability unavailable"}>{product.is_available ? text.available : text.unavailable}</span>{description ? <p className="detail-description">{description}</p> : null}<div className="detail-price"><strong>{money(product.sale_price ?? product.price)}</strong>{product.sale_price ? <><span>{text.regularPrice}</span><s>{money(product.price)}</s></> : null}</div>{product.promotions.length ? <div className="offers"><h2>{text.offers}</h2>{product.promotions.map((promotion) => <span key={`${promotion.discount_type}-${promotion.label}`}>{promotion.label}</span>)}</div> : null}<WhatsAppLink productName={name} /></div></div></section>;
}
