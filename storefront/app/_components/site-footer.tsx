"use client";

import Link from "next/link";

import { business, copy, social } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";
import { useLocale } from "./locale-provider";

export function SiteFooter() {
  const { locale } = useLocale();
  const text = copy[locale];
  const number = whatsAppNumber();
  return <footer className="site-footer"><div className="shell footer-inner">
    <div className="footer-brand"><p className="footer-name">Bahulu Berry Cameron</p><p>{business.town}</p><p>{business.hours[locale]}</p><p>© {new Date().getFullYear()} Bahulu Berry Cameron</p></div>
    <nav className="footer-links" aria-label={locale === "ms" ? "Pautan bawah" : "Footer links"}>
      <Link href="/products">{text.navProducts}</Link>
      <Link href="/about">{text.navAbout}</Link>
      <a href={social.tiktokUrl} target="_blank" rel="noreferrer">TikTok<span aria-hidden="true"> ↗</span></a>
      <a href={business.mapsUrl} target="_blank" rel="noreferrer">Google Maps<span aria-hidden="true"> ↗</span></a>
      {number ? <a href={whatsAppUrl(number, "")} target="_blank" rel="noreferrer">{text.whatsApp} {business.phoneDisplay}<span aria-hidden="true"> ↗</span></a> : null}
    </nav>
  </div></footer>;
}
