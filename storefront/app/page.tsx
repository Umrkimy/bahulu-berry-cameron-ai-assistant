import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeContent } from "./_components/home-content";
import { HomeCollection } from "./_components/home-collection";
import { getProducts, getFeaturedProduct, getHomepage } from "./_lib/api";
import { ProductHero } from "./_components/product-hero";
import type { StorefrontProduct } from "./_lib/types";
import { defaultHomepage } from "./_lib/content";
import { HomeStats } from "./_components/home-stats";
import { TikTokSection } from "./_components/tiktok-section";
import { getFeaturedVideos } from "./_lib/tiktok";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { absolute: "Bahulu Berry Cameron" },
  description: "Bahulu from Bahulu Berry Cameron in Cameron Highlands. Browse our products and current prices.",
  // Stays unindexed until the client approves the public launch.
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

export default async function HomePage() {
  let content = defaultHomepage;
  try { content = await getHomepage(); }
  catch { /* Keep the bundled fallback if the content API is unavailable. */ }
  return (
    <HomeContent content={content} hero={<Suspense fallback={<ProductHero product={null} />}><FeaturedHero /></Suspense>}
      stats={<HomeStats showPlaceholders={process.env.STOREFRONT_SHOW_PLACEHOLDERS === "true"} />}
      videos={<Suspense fallback={null}><FeaturedVideos /></Suspense>}>
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

async function FeaturedVideos() {
  return <TikTokSection videos={await getFeaturedVideos()} />;
}
