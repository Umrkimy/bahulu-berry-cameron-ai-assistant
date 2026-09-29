import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "../../_components/product-detail";
import { getCatalogueProducts, getProduct } from "../../_lib/api";
import { relatedProducts } from "../../_lib/product-view";

type Props = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).id);
  if (!product) return { title: "Product unavailable", robots: { index: false, follow: false } };
  return { title: product.name_en, description: product.description_en ?? `Learn more about ${product.name_en}.`, robots: { index: false, follow: false } };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  // The suggestions row is optional: if the catalogue can't load, skip it.
  const related = await getCatalogueProducts().then((all) => relatedProducts(all, product)).catch(() => []);
  return <ProductDetail product={product} related={related} />;
}
