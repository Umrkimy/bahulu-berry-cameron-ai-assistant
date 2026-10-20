import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import "./home-concept.css";
import "./catalogue-concept.css";
import "./cart-concept.css";
import { LocaleProvider } from "./_components/locale-provider";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";
import { CartProvider } from "./_components/cart-provider";
import { WhatsAppBubble } from "./_components/whatsapp-bubble";
import { isAccountsEnabled } from "./_lib/accounts";
import { isCheckoutPreviewEnabled } from "./_lib/checkout-preview";
import { comingSoonHeader } from "./_lib/coming-soon";
import { MotionProvider } from "./_components/motion";
import { LOCALE_COOKIE, parseLocale } from "./_lib/locale";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = { title: { default: "Bahulu Berry Cameron", template: "%s | Bahulu Berry Cameron" }, description: "Browse Bahulu Berry Cameron products and current prices.", metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffdc24" };

// Every page renders per request so it carries that request's CSP nonce.
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const comingSoon = (await headers()).get(comingSoonHeader) === "1";
  const locale = parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  if (comingSoon) return <html lang="en"><body className={`${display.variable} ${body.variable}`}><main id="main-content" tabIndex={-1}>{children}</main></body></html>;
  return <html lang={locale} data-scroll-behavior="smooth"><body className={`${display.variable} ${body.variable}`}><LocaleProvider initialLocale={locale}><MotionProvider><CartProvider><SiteHeader showAccount={isAccountsEnabled()} /><main id="main-content" tabIndex={-1}>{children}</main><SiteFooter showTracking={isCheckoutPreviewEnabled()} showAccount={isAccountsEnabled()} /><WhatsAppBubble /></CartProvider></MotionProvider></LocaleProvider></body></html>;
}
