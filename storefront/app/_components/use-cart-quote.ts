"use client";

import { useCallback, useEffect, useState } from "react";

import { quoteCart } from "../_lib/cart-api";
import type { StorefrontQuote } from "../_lib/types";
import { useCart } from "./cart-provider";

export function useCartQuote() {
  const { items, hydrated, recordPrices } = useCart();
  const [result, setResult] = useState<{ key: string; quote: StorefrontQuote | null; status: "ready" | "error" }>({ key: "", quote: null, status: "ready" });
  const [attempt, setAttempt] = useState(0);
  const requestKey = hydrated && items.length ? `${attempt}:${JSON.stringify(items)}` : "";

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    quoteCart(items, controller.signal).then((result) => {
      setResult({ key: requestKey, quote: result, status: "ready" });
      recordPrices(result.items.map((item) => ({ productId: item.product_id, displayPrice: item.display_price })));
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResult({ key: requestKey, quote: null, status: "error" });
    });
    return () => controller.abort();
  }, [items, requestKey, recordPrices]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const state = !requestKey ? "idle" : result.key !== requestKey ? "loading" : result.status;
  return { quote: result.key === requestKey ? result.quote : null, state, retry };
}
