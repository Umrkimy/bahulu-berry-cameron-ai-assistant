"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { accountCopy } from "../_lib/account-copy";
import { copy, homeCopy } from "../_lib/content";
import { HeaderCart } from "./header-cart";
import { LanguageMenu } from "./language-menu";
import { useLocale } from "./locale-provider";

export function SiteHeader({ showAccount = false }: { showAccount?: boolean }) {
  const { locale, setLocale } = useLocale();
  const text = copy[locale];
  const home = homeCopy[locale];
  const pathname = usePathname();

  return <header className="site-header concept-header">
    <a href="#main-content" className="skip-link">{home.skip}</a>
    <div className="shell header-inner">
      <Link className="brand concept-brand" href="/" aria-label={`Bahulu Berry Cameron — ${text.home}`}><Image src="/concept/brand-preview.webp" alt="" width={100} height={100} priority /><span>Bahulu Berry<br />Cameron</span></Link>
      <nav aria-label={home.navigation}>
        {[{ href: "/", label: text.home }, { href: "/products", label: text.navProducts }, { href: "/about", label: text.navAbout }].map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href || (item.href === "/products" && pathname.startsWith("/products/")) ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <LanguageMenu locale={locale} label={home.chooseLanguage} onChange={setLocale} />
      {showAccount ? <Link className="header-cart header-account" href="/account" aria-current={pathname === "/account" ? "page" : undefined} aria-label={accountCopy[locale].title}><svg className="cart-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.3-3.6 4.1-5.5 7.5-5.5s6.2 1.9 7.5 5.5" /></svg></Link> : null}
      <HeaderCart current={pathname === "/cart"} />
    </div>
  </header>;
}
