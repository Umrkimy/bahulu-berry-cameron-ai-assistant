"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { homeCopy, money } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

import { ProductArtwork } from "./product-artwork";
import { AddToCartButton } from "./add-to-cart-button";
import { Stagger, StaggerItem } from "./motion";

export function HomeCollection({ products, state }: { products: StorefrontProduct[]; state: "ready" | "loading" | "error" }) {
  const { locale } = useLocale();
  const text = homeCopy[locale];
  const router = useRouter();
  const [retrying, startTransition] = useTransition();

  if (state !== "ready" || products.length === 0) {
    const loading = state === "loading" || retrying;
    return <div className="collection-state" aria-busy={loading}>
      <div role="status"><h3>{loading ? text.loading : state === "error" ? text.errorTitle : text.emptyTitle}</h3>{state === "error" && !loading ? <p>{text.errorBody}</p> : null}</div>
      {state === "error" ? <button type="button" className="home-text-link" disabled={retrying} onClick={() => startTransition(() => router.refresh())}>{retrying ? text.loading : text.retry}</button> : null}
    </div>;
  }

  return <Stagger className="home-product-grid">{products.map((product) => {
    const name = locale === "ms" ? product.name_ms : product.name_en;
    return <StaggerItem as="article" className="home-product-card" key={product.id}>
      <Link href={`/products/${product.id}`} className="home-product-photo" tabIndex={-1} aria-hidden="true">
        <ProductArtwork imagePath={product.image_path} name={name} />
      </Link>
      <h3><Link href={`/products/${product.id}`}>{name}</Link></h3>
      <div className="home-card-action"><p>{money(product.sale_price ?? product.price)}</p><AddToCartButton product={product} /></div>
    </StaggerItem>;
  })}</Stagger>;
}
