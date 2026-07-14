export interface Inventory {
  id: number;
  product_id: number;
  quantity: number;
  low_stock_threshold: number;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  price: string;
  image_path: string;
  category: string | null;
  inventory: Inventory | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
}

export interface UpdateProductData {
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_active: boolean;
}