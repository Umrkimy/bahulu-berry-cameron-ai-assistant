export const CART_STORAGE_KEY = "bbc-storefront-cart-v1";
export const MAX_CART_QUANTITY = 99;

export interface CartItem {
  productId: number;
  quantity: number;
}

export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const combined = new Map<number, number>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const productId = Number((entry as Record<string, unknown>).productId);
    const quantity = Number((entry as Record<string, unknown>).quantity);
    if (!Number.isSafeInteger(productId) || productId <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) continue;
    combined.set(productId, Math.min(MAX_CART_QUANTITY, (combined.get(productId) ?? 0) + quantity));
  }
  return [...combined].map(([productId, quantity]) => ({ productId, quantity }));
}

export function parseStoredCart(raw: string | null): CartItem[] {
  if (!raw) return [];
  try { return sanitizeCart(JSON.parse(raw)); }
  catch { return []; }
}

export function addCartItem(items: CartItem[], productId: number): CartItem[] {
  const existing = items.find((item) => item.productId === productId);
  if (!existing) return [...items, { productId, quantity: 1 }];
  return items.map((item) => item.productId === productId
    ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + 1) }
    : item);
}

export function updateCartItem(items: CartItem[], productId: number, quantity: number): CartItem[] {
  if (quantity <= 0) return items.filter((item) => item.productId !== productId);
  const next = Math.min(MAX_CART_QUANTITY, Math.max(1, Math.trunc(quantity)));
  return items.map((item) => item.productId === productId ? { ...item, quantity: next } : item);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}
