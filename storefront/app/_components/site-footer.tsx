"use client";

import Link from "next/link";

import { copy } from "../_lib/content";
import { useLocale } from "./locale-provider";

export function SiteFooter() {
  const { locale } = useLocale();
  const text = copy[locale];
  return <footer className="site-footer"><div className="shell footer-inner"><p>© {new Date().getFullYear()} Bahulu Berry Cameron</p><div><Link href="/pickup-delivery">{text.navPickup}</Link><Link href="/about">{text.navAbout}</Link></div></div></footer>;
}
