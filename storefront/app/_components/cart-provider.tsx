"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { addCartItem, cartCount, CART_STORAGE_KEY, parseStoredCart, updateCartItem, type CartItem } from "../_lib/cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  changedProductIds: ReadonlySet<number>;
  addItem: (productId: number, displayPrice: string, announcement: string) => void;
  updateItem: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clear: () => void;
  recordPrices: (prices: Array<{ productId: number; displayPrice: string | null }>) => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_CHANGE_EVENT = "bbc-storefront-cart-change";

function subscribeToCart(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === CART_STORAGE_KEY) callback(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_CHANGE_EVENT, callback);
  };
}

function getCartSnapshot() {
  return window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]";
}

export function CartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeToCart, getCartSnapshot, () => null);
  const items = useMemo(() => parseStoredCart(snapshot), [snapshot]);
  const hydrated = snapshot !== null;
  const [announcement, setAnnouncement] = useState("");
  const [changedProductIds, setChangedProductIds] = useState<ReadonlySet<number>>(new Set());
  const prices = useRef(new Map<number, string>());

  const save = useCallback((update: (current: CartItem[]) => CartItem[]) => {
    const current = parseStoredCart(window.localStorage.getItem(CART_STORAGE_KEY));
    const next = update(current);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CART_CHANGE_EVENT));
  }, []);

  const addItem = useCallback((productId: number, displayPrice: string, message: string) => {
    if (!prices.current.has(productId)) prices.current.set(productId, displayPrice);
    save((current) => addCartItem(current, productId));
    setAnnouncement(message);
  }, [save]);

  const updateItem = useCallback((productId: number, quantity: number) => {
    save((current) => updateCartItem(current, productId, quantity));
  }, [save]);

  const removeItem = useCallback((productId: number) => {
    save((current) => current.filter((item) => item.productId !== productId));
    prices.current.delete(productId);
    setChangedProductIds((current) => {
      const next = new Set(current);
      next.delete(productId);
      return next;
    });
  }, [save]);

  const clear = useCallback(() => {
    save(() => []);
    prices.current.clear();
    setChangedProductIds(new Set());
  }, [save]);

  const recordPrices = useCallback((currentPrices: Array<{ productId: number; displayPrice: string | null }>) => {
    const changed: number[] = [];
    for (const item of currentPrices) {
      if (item.displayPrice === null) continue;
      const previous = prices.current.get(item.productId);
      if (previous !== undefined && previous !== item.displayPrice) changed.push(item.productId);
      prices.current.set(item.productId, item.displayPrice);
    }
    if (changed.length) setChangedProductIds((current) => new Set([...current, ...changed]));
  }, []);

  const value = useMemo(() => ({ items, count: cartCount(items), hydrated, changedProductIds, addItem, updateItem, removeItem, clear, recordPrices }), [items, hydrated, changedProductIds, addItem, updateItem, removeItem, clear, recordPrices]);
  return <CartContext.Provider value={value}>{children}<p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p></CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
