import api from "./axios";

import type {
  PaginatedProducts,
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product";

export interface ProductImportRow {
  row_number: number;
  name: string;
  category: string | null;
  description: string | null;
  price_myr: string;
  opening_stock: number;
  low_stock_threshold: number;
}

export interface ProductImportIssue {
  row_number: number | null;
  field: string | null;
  message: string;
}

export interface ProductImportPreview {
  rows: ProductImportRow[];
  errors: ProductImportIssue[];
  can_import: boolean;
}

export async function getProducts() {
  const response = await api.get<PaginatedProducts>("/products/admin");

  return response.data;
}

export async function createProduct(data: CreateProductData) {
  const response = await api.post<Product>("/products/", data);

  return response.data;
}

export async function updateProduct(
  productId: number,
  data: Partial<UpdateProductData>,
) {
  const response = await api.patch<Product>(`/products/${productId}`, data);

  return response.data;
}

export async function deleteProduct(productId: number) {
  await api.delete(`/products/${productId}`);
}

export async function downloadProductImportTemplate() {
  return (await api.get<Blob>("/products/import/template", { responseType: "blob" })).data;
}

export async function previewProductImport(file: File) {
  const data = new FormData();
  data.append("file", file);
  return (await api.post<ProductImportPreview>("/products/import/preview", data, { headers: { "Content-Type": "multipart/form-data" } })).data;
}

export async function importProducts(file: File) {
  const data = new FormData();
  data.append("file", file);
  return (await api.post<{ imported_count: number; message: string }>("/products/import", data, { headers: { "Content-Type": "multipart/form-data" } })).data;
}
