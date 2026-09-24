import { cache } from "react";

import type { ProductPage, StorefrontProduct } from "./types";

const apiBaseUrl = (process.env.STOREFRONT_SERVER_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

async function storefrontFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { next: { revalidate: 60 } });
  if (!response.ok) {
    throw new Error("Unable to load the current catalogue.");
  }
  return response.json() as Promise<T>;
}

export const getProducts = cache(async (): Promise<ProductPage> => storefrontFetch<ProductPage>("/storefront/products"));

// The catalogue filters locally, so it needs every page, not just the first 24.
// Keep the home page on getProducts: it only displays six featured products.
export const getCatalogueProducts = cache(async (): Promise<StorefrontProduct[]> => {
  const first = await storefrontFetch<ProductPage>("/storefront/products?page=1&page_size=48");
  const items = [...first.items];
  for (let page = 2; page <= first.pages; page += 1) {
    const next = await storefrontFetch<ProductPage>(`/storefront/products?page=${page}&page_size=48`);
    items.push(...next.items);
  }
  return [...new Map(items.map((product) => [product.id, product])).values()];
});

export const getProduct = cache(async (id: string): Promise<StorefrontProduct | null> => {
  // Invalid URLs should reach the not-found page, not trigger an API error.
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) return null;
  const response = await fetch(`${apiBaseUrl}/storefront/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load this product.");
  return response.json() as Promise<StorefrontProduct>;
});
