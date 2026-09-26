export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  low_stock_threshold: number;
}

export interface Product {
  images?: ProductImage[];
  sale_price?: string | null;
  id: number;
  name: string;
  description: string | null;
  price: string;
  image_path: string;
  category: string | null;
  inventory: Inventory | null;
  is_active: boolean;
  storefront_published: boolean;
  name_ms: string | null;
  description_ms: string | null;
  created_at: string;
  updated_at: string;
  active_discount: ActiveDiscount | null;
  active_discounts: ActiveDiscount[];
}

export interface ActiveDiscount {
  id: number;
  name: string;
  discount_type: "PERCENTAGE" | "FIXED_AMOUNT" | "BUNDLE_PRICE";
  discount_value: number | string;
  bundle_quantity: number | null;
  start_at: string;
  end_at: string;
}

export interface ProductImage {
  id: number;
  image_path: string;
  position: number;
}

export interface PaginatedProducts {
  items: Product[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}

export interface CreateProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_active: boolean;
  initial_quantity: number;
  name_ms?: string;
  description_ms?: string;
}

export interface UpdateProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_active: boolean;
  storefront_published?: boolean;
  name_ms?: string;
  description_ms?: string;
}
