"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { cookieLocale, localeCookie, LOCALE_STORAGE_KEY } from "../_lib/locale";
import type { Locale } from "../_lib/types";

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => undefined });
const localeEvent = "bbc-storefront-locale-change";
let fallbackLocale: Locale = "en";
let useFallbackLocale = false;

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeEvent, callback);
  };
}

function storedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return value === "ms" || value === "en" ? value : null;
  } catch {
    return null;
  }
}

function getSnapshot(): Locale {
  if (useFallbackLocale) return fallbackLocale;
  return storedLocale() ?? cookieLocale(document.cookie) ?? fallbackLocale;
}

function saveCookie(locale: Locale) {
  document.cookie = localeCookie(locale, window.location.protocol === "https:");
}

export function LocaleProvider({ initialLocale = "en", children }: Readonly<{ initialLocale?: Locale; children: React.ReactNode }>) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => initialLocale);
  const setLocale = useCallback((nextLocale: Locale) => {
    fallbackLocale = nextLocale;
    saveCookie(nextLocale);
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
      useFallbackLocale = false;
    } catch {
      // Language switching still works when browser storage is blocked.
      useFallbackLocale = true;
    }
    window.dispatchEvent(new Event(localeEvent));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    // Choices saved before the cookie existed still reach the server next time.
    if (cookieLocale(document.cookie) !== locale) saveCookie(locale);
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
