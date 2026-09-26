"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { homeCopy, money } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

import { ProductArtwork } from "./product-artwork";
import { AddToCartButton } from "./add-to-cart-button";

export function HomeCollection({ products, state }: { products: StorefrontProduct[]; state: "ready" | "loading" | "error" }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  if (state !== "ready" || products.length === 0) {
    const loading = state === "loading" || retrying;
    return <div className="collection-state" aria-busy={loading}>
      <span className="collection-state-mark" aria-hidden="true">✳</span>
      <div role="status"><h3>{loading ? text.loading : state === "error" ? text.errorTitle : text.emptyTitle}</h3><p>{loading ? text.loadingBody : state === "error" ? text.errorBody : text.emptyBody}</p></div>
      {state === "error" ? <button type="button" className="home-text-link" disabled={retrying} onClick={() => startTransition(() => router.refresh())}>{retrying ? text.loading : text.retry}<span aria-hidden="true">↻</span></button> : null}
    </div>;
  }

  return <div className="home-product-grid">{products.map((product, index) => {
    const name = locale === "ms" ? product.name_ms : product.name_en;
    return <article className="home-product-card" key={product.id}>
      <Link href={`/products/${product.id}`} className="home-product-photo" aria-label={`${text.viewProduct}: ${name}`}>
        <span className="product-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <ProductArtwork imagePath={product.image_path} name={name} />
        <span className="product-arrow" aria-hidden="true">↗</span>
      </Link>
      <h3><Link href={`/products/${product.id}`}>{name}</Link></h3>
      <div className="home-card-action"><p>{money(product.sale_price ?? product.price)}</p><AddToCartButton product={product} /></div>
    </article>;
  })}</div>;
}
