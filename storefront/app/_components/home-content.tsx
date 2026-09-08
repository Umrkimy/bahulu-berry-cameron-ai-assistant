"use client";

import Link from "next/link";

import { Catalogue } from "./catalogue";
import { WhatsAppLink } from "./whatsapp-link";
import { copy } from "../_lib/content";
import type { StorefrontProduct } from "../_lib/types";
import { useLocale } from "./locale-provider";

export function HomeContent({ products }: { products: StorefrontProduct[] }) {
  const { locale } = useLocale();
  const text = copy[locale];
  return <><section className="hero"><div className="shell hero-grid"><div><p className="eyebrow">{text.heroEyebrow}</p><h1>{text.heroTitle}</h1><p className="hero-copy">{text.heroText}</p><div className="hero-actions"><Link href="/products" className="button button-primary">{text.browse}</Link><WhatsAppLink className="button button-secondary" /></div></div><div className="hero-art" aria-label="Bahulu and berry-inspired bakery collection"><span>{locale === "ms" ? <>Dibuat<br />dengan teliti</> : <>Freshly<br />considered</>}</span></div></div></section><section className="shell featured"><div className="section-heading"><div><p className="eyebrow">{locale === "ms" ? "Koleksi semasa" : "Current collection"}</p><h2>{text.catalogue}</h2></div><Link href="/products" className="text-link">{locale === "ms" ? "Lihat semua produk" : "View all products"}</Link></div><Catalogue products={products.slice(0, 6)} /></section><section className="shell contact-panel"><div><p className="eyebrow">{locale === "ms" ? "Perlukan bantuan?" : "Need a hand?"}</p><h2>{text.contactTitle}</h2><p>{text.contactText}</p></div><WhatsAppLink /></section></>;
}
