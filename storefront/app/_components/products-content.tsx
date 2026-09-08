"use client";

import { Catalogue } from "./catalogue";
import { copy } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

export function ProductsContent({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = copy[locale];
  return <section className="shell page-section"><p className="eyebrow">Bahulu Berry Cameron</p><h1 className="page-title">{text.catalogue}</h1><p className="page-intro">{text.catalogueIntro}</p><Catalogue products={products} /></section>;
}
