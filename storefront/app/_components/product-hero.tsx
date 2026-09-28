"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import type { StorefrontProduct } from "../_lib/types";
import { productMediaUrl } from "../_lib/product-media";
import { homeCopy } from "../_lib/content";
import { useLocale } from "./locale-provider";

export function ProductHero({ product }: { product: StorefrontProduct | null }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const [imageFailed, setImageFailed] = useState(false);
  const src = productMediaUrl(product?.image_path ?? null);
  const name = product ? (locale === "ms" ? product.name_ms : product.name_en) : null;
  const useFallbackArtwork = imageFailed || !src;

  const heroImage = useFallbackArtwork ? (
    <Image src="/concept/bahulu-bag.webp" alt={text.imageAlt} width={900} height={1350} sizes="(max-width: 760px) 70vw, 420px" loading="eager" className="hero-product-image hero-fallback-image" />
  ) : (
    <Image src={src} alt={name ?? ""} width={900} height={1350} unoptimized sizes="(max-width: 760px) 85vw, 520px" loading="eager" className="hero-product-image" onError={() => setImageFailed(true)} />
  );

  return (
    <figure className="product-stage">
      <div className="product-settle">
        {product ? <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">{heroImage}</Link> : heroImage}
      </div>
      {product && name ? <figcaption className="stage-caption"><Link href={`/products/${product.id}`}>{name}</Link></figcaption> : null}
    </figure>
  );
}
