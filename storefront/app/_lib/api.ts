import { headers } from "next/headers.js";
import { cache } from "react";

import { apiBaseUrl, clientIpHeaders } from "./server-api.ts";
import { isTrackingToken, type TrackedOrder } from "./order-tracking.ts";
import type { HomepageContent, ProductPage, StorefrontProduct } from "./types";

async function visitorHeaders(): Promise<Record<string, string>> {
  try {
    return clientIpHeaders((await headers()).get("cf-connecting-ip"));
  } catch {
    // Outside a request (unit tests, build-time rendering) there is no visitor.
    return {};
  }
}

async function storefrontFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: await visitorHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new Error("Unable to load the current catalogue.");
  }
  return response.json() as Promise<T>;
}

// Homepage retry must reach the API rather than reuse an earlier response.
export const getProducts = cache(async (): Promise<ProductPage> => storefrontFetch<ProductPage>("/storefront/products"));
export const getFeaturedProduct = cache(async (): Promise<StorefrontProduct | null> => storefrontFetch<StorefrontProduct | null>("/storefront/featured"));
export const getHomepage = cache(async (): Promise<HomepageContent> => storefrontFetch<HomepageContent>("/storefront/homepage"));

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
  const response = await fetch(`${apiBaseUrl}/storefront/products/${encodeURIComponent(id)}`, { headers: await visitorHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load this product.");
  return response.json() as Promise<StorefrontProduct>;
});

export type TrackedOrderResult = { state: "found"; order: TrackedOrder } | { state: "missing" } | { state: "error" };

// A tracking link is private: never cached, and any miss looks the same.
export async function getTrackedOrder(token: string): Promise<TrackedOrderResult> {
  if (!isTrackingToken(token)) return { state: "missing" };
  try {
    const response = await fetch(`${apiBaseUrl}/storefront/orders/track/${token}`, {
      headers: await visitorHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return { state: "missing" };
    if (!response.ok) return { state: "error" };
    return { state: "found", order: await response.json() as TrackedOrder };
  } catch {
    return { state: "error" };
  }
}
