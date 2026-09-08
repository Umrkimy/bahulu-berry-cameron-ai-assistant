import type { Metadata } from "next";

import { getProducts } from "../_lib/api";
import { ProductsContent } from "../_components/products-content";

export const metadata: Metadata = { title: "Products", description: "Browse the current Bahulu Berry Cameron catalogue." };
export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductsContent products={products.items} />;
}
