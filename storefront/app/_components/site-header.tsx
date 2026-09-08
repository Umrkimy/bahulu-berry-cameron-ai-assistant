"use client";

import Link from "next/link";

import { copy } from "../_lib/content";
import { useLocale } from "./locale-provider";

export function SiteHeader() {
  const { locale, setLocale } = useLocale();
  const text = copy[locale];

  return <header className="site-header"><div className="shell header-inner"><Link className="brand" href="/" aria-label="Bahulu Berry Cameron home"><span className="brand-mark" aria-hidden>BB</span><span>Bahulu Berry<br />Cameron</span></Link><nav aria-label="Main navigation"><Link href="/products">{text.navProducts}</Link><Link href="/pickup-delivery">{text.navPickup}</Link><Link href="/about">{text.navAbout}</Link></nav><button type="button" className="language-button" onClick={() => setLocale(locale === "en" ? "ms" : "en")} aria-label={`Switch language to ${text.language}`}>{text.language}</button></div></header>;
}
