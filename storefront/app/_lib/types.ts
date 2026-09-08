export type Locale = "en" | "ms";

export interface Promotion {
  label: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE";
  discount_value: string;
  bundle_quantity: number | null;
}

export interface StorefrontProduct {
  id: number;
  name_en: string;
  name_ms: string;
  description_en: string | null;
  description_ms: string | null;
  category: string | null;
  price: string;
  sale_price: string | null;
  image_path: string | null;
  is_available: boolean;
  promotions: Promotion[];
}

export interface ProductPage {
  items: StorefrontProduct[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}
