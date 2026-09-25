import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "../../_components/product-detail";
import { getProduct } from "../../_lib/api";

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
  return <ProductDetail product={product} />;
}
