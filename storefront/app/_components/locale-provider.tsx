"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";

import type { Locale } from "../_lib/types";

const LocaleContext = createContext<{ locale: Locale; setLocale: (locale: Locale) => void }>({ locale: "en", setLocale: () => undefined });
const localeEvent = "bbc-storefront-locale-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(localeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(localeEvent, callback);
  };
}

function getSnapshot(): Locale {
  return window.localStorage.getItem("bbc-storefront-locale") === "ms" ? "ms" : "en";
}

function getServerSnapshot(): Locale {
  return "en";
}

export function LocaleProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem("bbc-storefront-locale", nextLocale);
    window.dispatchEvent(new Event(localeEvent));
  }, []);

  const value = useMemo(() => ({
    locale,
    setLocale,
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
