"use client";

import Link from "next/link";
import { Catalogue } from "./catalogue";
import { productCopy } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";
import { PopLines, Reveal } from "./motion";

export function ProductsContent({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  return <div className="product-concept">
    <section className="catalogue-hero"><div className="shell">
      <nav className="shop-breadcrumb" aria-label={text.breadcrumb}><Link href="/">{text.home}</Link><span aria-hidden="true">/</span><span aria-current="page">{text.products}</span></nav>
      <div className="catalogue-hero-copy"><h1 aria-label={`${text.title} ${text.titleAccent}`}><span aria-hidden="true"><PopLines lines={[<>{text.title} <em>{text.titleAccent}</em></>]} /></span></h1><Reveal delay={0.3} y={16}><p className="catalogue-intro">{text.intro}</p></Reveal></div>
    </div></section>
    <div className="shell catalogue-content"><Catalogue products={products} /></div>
  </div>;
}
