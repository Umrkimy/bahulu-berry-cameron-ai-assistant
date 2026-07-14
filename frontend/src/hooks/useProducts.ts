import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../api/products";

import type { UpdateProductData } from "../types/product";

export function useProducts() {
  return useQuery({
    queryKey: ["products"],

    queryFn: getProducts,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      productId,
      data,
    }: {
      productId: number;
      data: Partial<UpdateProductData>;
    }) => updateProduct(productId, data),

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProduct,

    onSuccess() {
      queryClient.invalidateQueries({
        queryKey: ["products"],
      });
    },
  });
}
