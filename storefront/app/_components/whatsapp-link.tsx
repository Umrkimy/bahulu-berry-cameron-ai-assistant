"use client";

import { useLocale } from "./locale-provider";
import { copy } from "../_lib/content";
import { whatsAppNumber, whatsAppUrl } from "../_lib/whatsapp";

export function WhatsAppLink({ productName, className = "home-button" }: { productName?: string; className?: string }) {
  const { locale } = useLocale();
  const number = whatsAppNumber();
  if (!number) return null;
  const message = productName
    ? locale === "ms" ? `Hai, saya ingin bertanya tentang ${productName}.` : `Hello, I would like to ask about ${productName}.`
    : locale === "ms" ? "Hai, saya ingin bertanya tentang produk Bahulu Berry Cameron." : "Hello, I would like to ask about Bahulu Berry Cameron products.";
  return <a className={className} href={whatsAppUrl(number, message)} target="_blank" rel="noreferrer">{copy[locale].enquire}<span aria-hidden="true">↗</span></a>;
}
