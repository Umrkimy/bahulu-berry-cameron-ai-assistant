import type { Locale } from "./types";

// Mirrors the browser's saved choice so the server renders the same language
// and the page does not switch after loading. It only ever holds "en" or "ms".
export const LOCALE_COOKIE = "bbc_locale";
export const LOCALE_STORAGE_KEY = "bbc-storefront-locale";

export function parseLocale(value: string | null | undefined): Locale {
  return value === "ms" ? "ms" : "en";
}

export function localeCookie(locale: Locale, secure: boolean): string {
  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function cookieLocale(cookieHeader: string): Locale | null {
  for (const part of cookieHeader.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === LOCALE_COOKIE && (value === "en" || value === "ms")) return value;
  }
  return null;
}
