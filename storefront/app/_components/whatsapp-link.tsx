"use client";

import { useLocale } from "./locale-provider";
import { copy } from "../_lib/content";

export function WhatsAppLink({ productName, className = "button button-primary" }: { productName?: string; className?: string }) {
  const { locale } = useLocale();
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const text = copy[locale];
  const message = productName
    ? locale === "ms" ? `Hai, saya ingin bertanya tentang ${productName}.` : `Hello, I would like to ask about ${productName}.`
    : locale === "ms" ? "Hai, saya ingin bertanya tentang produk Bahulu Berry Cameron." : "Hello, I would like to ask about Bahulu Berry Cameron products.";

  if (!number) return <span className={`${className} is-disabled`} aria-disabled="true" title="WhatsApp contact is awaiting confirmation">{text.enquire}</span>;
  return <a className={className} href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">{text.enquire}<span aria-hidden> ↗</span></a>;
}
