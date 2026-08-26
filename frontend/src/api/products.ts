import api from "./axios";

import type {
  PaginatedProducts,
  CreateProductData,
  Product,
  UpdateProductData,
} from "../types/product";

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
