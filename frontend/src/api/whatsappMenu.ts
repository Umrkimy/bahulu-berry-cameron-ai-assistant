import api from "./axios";

export const MENU_TEXT_KEYS = ["menu", "back", "products", "sold_out", "no_products", "browse", "order", "ask_order", "order_status", "order_not_found", "hours", "handoff", "rating_ask", "rating_thanks", "comment_thanks"] as const;
export const MENU_STATUS_KEYS = ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED"] as const;

export type MenuTextKey = (typeof MENU_TEXT_KEYS)[number];
export type MenuStatusKey = (typeof MENU_STATUS_KEYS)[number];
export type MenuLanguage = "EN" | "MS";
export type MenuLanguageCopy = Record<MenuTextKey, string> & { statuses: Record<MenuStatusKey, string> };
export type MenuCopy = Record<MenuLanguage, MenuLanguageCopy>;

export interface MenuCopyResponse {
  defaults: MenuCopy;
  current: MenuCopy;
  placeholders: Record<MenuTextKey, string[]>;
  version: number;
  updated_at: string | null;
}

export async function getMenuCopy() {
  return (await api.get<MenuCopyResponse>("/support/whatsapp-menu")).data;
}

export async function saveMenuCopy(expectedVersion: number, copy: MenuCopy) {
  return (await api.put<MenuCopyResponse>("/support/whatsapp-menu", { expected_version: expectedVersion, copy })).data;
}
