"use client";

import Image from "next/image";
import Link from "next/link";

import { money, copy } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { WhatsAppLink } from "./whatsapp-link";

const assetOrigin = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/api\/?$/, "");

export function ProductCard({ product }: { product: StorefrontProduct }) {
  const { locale } = useLocale();
  const text = copy[locale];
  const name = locale === "ms" ? product.name_ms : product.name_en;
  const description = locale === "ms" ? product.description_ms : product.description_en;
  const imageSource = product.image_path ? `${assetOrigin}${product.image_path}` : null;

  return <article className="product-card"><Link className="product-image" href={`/products/${product.id}`} aria-label={name}>{imageSource ? <Image src={imageSource} alt={name} fill sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 33vw" /> : <span>{text.imagePending}</span>}</Link><div className="product-card-body"><div className="product-meta"><span>{product.category ?? ""}</span><span className={product.is_available ? "availability" : "availability unavailable"}>{product.is_available ? text.available : text.unavailable}</span></div><h2><Link href={`/products/${product.id}`}>{name}</Link></h2>{description ? <p>{description}</p> : null}{product.promotions.length ? <div className="promotion-list">{product.promotions.map((promotion) => <span key={`${promotion.discount_type}-${promotion.label}`}>{promotion.label}</span>)}</div> : null}<div className="price-row"><strong>{money(product.sale_price ?? product.price)}</strong>{product.sale_price ? <s>{money(product.price)}</s> : null}</div><div className="card-actions"><Link href={`/products/${product.id}`} className="text-link">{text.browse}</Link><WhatsAppLink productName={name} className="text-link" /></div></div></article>;
}
