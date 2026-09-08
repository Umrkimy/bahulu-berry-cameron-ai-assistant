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

export const getProduct = cache(async (id: string): Promise<StorefrontProduct | null> => {
  const response = await fetch(`${apiBaseUrl}/storefront/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load this product.");
  return response.json() as Promise<StorefrontProduct>;
});
