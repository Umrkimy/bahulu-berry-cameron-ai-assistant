import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeContent } from "./_components/home-content";
import { HomeCollection } from "./_components/home-collection";
import { getProducts, getFeaturedProduct } from "./_lib/api";
import { ProductHero } from "./_components/product-hero";
import type { StorefrontProduct } from "./_lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Homepage concept | Bahulu Berry Cameron",
  description: "Private homepage design preview for Bahulu Berry Cameron.",
  robots: { index: false, follow: false },
};

async function FeaturedProducts() {
  let products: StorefrontProduct[] = [];
  let state: "ready" | "error" = "ready";
  try {
    products = (await getProducts()).items.slice(0, 6);
  } catch {
    state = "error";
  }
  return <HomeCollection products={products} state={state} />;
}

export default function HomePage() {
  return (
    <HomeContent hero={<Suspense fallback={<ProductHero product={null} />}><FeaturedHero /></Suspense>}>
      <Suspense fallback={<HomeCollection products={[]} state="loading" />}>
        <FeaturedProducts />
      </Suspense>
    </HomeContent>
  );
}

async function FeaturedHero() {
  let product: StorefrontProduct | null = null;
  try { product = await getFeaturedProduct(); }
  catch { /* Keep the branded hero available when the API is unavailable. */ }
  return <ProductHero key={product?.image_path ?? "empty"} product={product} />;
}
