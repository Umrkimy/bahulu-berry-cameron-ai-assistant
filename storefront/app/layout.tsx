import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { LocaleProvider } from "./_components/locale-provider";
import { SiteFooter } from "./_components/site-footer";
import { SiteHeader } from "./_components/site-header";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = { title: { default: "Bahulu Berry Cameron", template: "%s | Bahulu Berry Cameron" }, description: "Browse the current Bahulu Berry Cameron collection and enquire directly with the team.", metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7c2534" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${body.variable}`}><LocaleProvider><SiteHeader /><main>{children}</main><SiteFooter /></LocaleProvider></body></html>;
}
