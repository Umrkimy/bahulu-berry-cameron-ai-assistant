"use client";

import Image from "next/image";
import Link from "next/link";
import { Catalogue } from "./catalogue";
import { productCopy } from "../_lib/product-view";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

export function ProductsContent({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = productCopy[locale];
  return <div className="product-concept">
    <section className="catalogue-hero"><div className="shell">
      <nav className="shop-breadcrumb" aria-label={text.breadcrumb}><Link href="/">{text.home}</Link><span aria-hidden="true">/</span><span aria-current="page">{text.products}</span></nav>
      <div className="catalogue-hero-grid"><div><p className="home-kicker">{text.eyebrow}</p><h1>{text.title}<br /><em>{text.titleAccent}</em></h1><p className="catalogue-intro">{text.intro}</p></div><div className="catalogue-hero-art" aria-hidden="true"><span className="catalogue-orbit" /><Image src="/concept/brand-preview.webp" alt="" width={260} height={260} /><span className="catalogue-spark">✳</span></div></div>
    </div></section>
    <div className="shell catalogue-content"><Catalogue products={products} /></div>
    <div className="shell catalogue-end"><span aria-hidden="true">✳</span><span>BAHULU BERRY CAMERON</span><Link href="/">{text.home}<span aria-hidden="true"> ↗</span></Link></div>
  </div>;
}
