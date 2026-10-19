"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { homeCopy } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

import { ProductCard } from "./product-card";
import { Stagger } from "./motion";

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

  return <Stagger className="home-product-grid">{products.map((product) => <ProductCard key={product.id} product={product} headingLevel="h3" />)}</Stagger>;
}
