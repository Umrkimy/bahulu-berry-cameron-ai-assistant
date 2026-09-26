"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { copy, homeCopy } from "../_lib/content";
import { cartCopy } from "../_lib/cart-copy";
import { useCart } from "./cart-provider";
import { useLocale } from "./locale-provider";

export function SiteHeader() {
  const { locale, setLocale } = useLocale();
  const text = copy[locale];
  const home = homeCopy[locale];
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const cart = cartCopy[locale];

  return <header className={`site-header concept-header${pathname === "/" || pathname.startsWith("/products") ? " home-header" : ""}`}>
    <a href="#main-content" className="skip-link">{home.skip}</a>
    <div className="concept-banner">{home.preview}<span aria-hidden="true"> · </span>BAHULU BERRY CAMERON</div>
    <div className="shell header-inner">
      <Link className="brand concept-brand" href="/" aria-label={`Bahulu Berry Cameron — ${text.home}`}><Image src="/concept/brand-preview.webp" alt="" width={100} height={100} priority /><span>Bahulu Berry<br />Cameron</span></Link>
      <nav aria-label={home.navigation}>
        {[{ href: "/", label: text.home }, { href: "/products", label: text.navProducts }, { href: "/about", label: text.navAbout }].map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href || (item.href === "/products" && pathname.startsWith("/products/")) ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <button type="button" className="language-button" onClick={() => setLocale(locale === "en" ? "ms" : "en")} aria-label={home.switchLanguage}><span aria-hidden="true">◎</span> {text.language}</button>
      <Link className="header-cart" href="/cart" aria-current={pathname === "/cart" ? "page" : undefined} aria-label={`${cart.cart}: ${hydrated ? count : 0}`}><span>{cart.cart}</span><strong aria-hidden="true">{hydrated ? count : 0}</strong></Link>
    </div>
  </header>;
}
