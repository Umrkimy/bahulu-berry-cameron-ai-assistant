export type Locale = "en" | "ms";

export interface BilingualText { en: string; ms: string }
export interface HomepageContent {
  hero: { eyebrow: BilingualText; title_primary: BilingualText; title_accent: BilingualText; title_suffix: BilingualText; body: BilingualText; cta_label: BilingualText };
  benefits: { enabled: boolean; eyebrow: BilingualText; title: BilingualText; items: { title: BilingualText; body: BilingualText }[] };
  collection: { eyebrow: BilingualText; title: BilingualText; view_all_label: BilingualText };
  story: { eyebrow: BilingualText; title: BilingualText; body: BilingualText; cta_label: BilingualText };
  reviews: { enabled: boolean; eyebrow: BilingualText; title: BilingualText };
  location: { enabled: boolean; eyebrow: BilingualText; title: BilingualText; load_map_label: BilingualText; directions_label: BilingualText };
  closing: { eyebrow: BilingualText; title: BilingualText; body: BilingualText; cta_label: BilingualText };
  google_place_id: string | null;
}

export interface StorefrontReview {
  author_name: string; author_uri: string | null; rating: number; text: string;
  relative_time: string; review_uri: string | null; report_uri: string | null;
  translated: boolean; original_language: string | null;
}

export interface StorefrontPlace {
  display_name: string; formatted_address: string; rating: number | null; review_count: number;
  place_uri: string; reviews_uri: string; directions_uri: string; reviews: StorefrontReview[];
  provider: "Google"; sorting_notice: string;
}

export interface Promotion {
  label: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE";
  discount_value: string;
  bundle_quantity: number | null;
}

export interface StorefrontProduct {
  images?: { id: number; image_path: string; position: number }[];
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

export type StorefrontQuoteStatus = "READY" | "NOT_AVAILABLE" | "QUANTITY_UNAVAILABLE";

export interface StorefrontQuoteLine {
  product_id: number;
  quantity: number;
  status: StorefrontQuoteStatus;
  name_en: string | null;
  name_ms: string | null;
  image_path: string | null;
  unit_price: string | null;
  display_price: string | null;
  subtotal: string | null;
  discount_amount: string | null;
  total_amount: string | null;
  promotions: Promotion[];
}

export interface StorefrontQuote {
  ready: boolean;
  items: StorefrontQuoteLine[];
  subtotal: string | null;
  discount_amount: string | null;
  total_amount: string | null;
}
