import type { Metadata } from "next";

import { getCatalogueProducts } from "../_lib/api";
import { ProductsContent } from "../_components/products-content";

export const metadata: Metadata = { title: "Products", description: "Browse the current Bahulu Berry Cameron catalogue.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getCatalogueProducts();
  return <ProductsContent products={products} />;
}
