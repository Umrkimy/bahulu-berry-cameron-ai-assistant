"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

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

function getSnapshot(): Locale {
  if (useFallbackLocale) return fallbackLocale;
  try {
    return window.localStorage.getItem("bbc-storefront-locale") === "ms" ? "ms" : "en";
  } catch {
    return fallbackLocale;
  }
}

function getServerSnapshot(): Locale {
  return "en";
}

export function LocaleProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setLocale = useCallback((nextLocale: Locale) => {
    fallbackLocale = nextLocale;
    try {
      window.localStorage.setItem("bbc-storefront-locale", nextLocale);
      useFallbackLocale = false;
    } catch {
      // Language switching still works when browser storage is blocked.
      useFallbackLocale = true;
    }
    window.dispatchEvent(new Event(localeEvent));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
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
