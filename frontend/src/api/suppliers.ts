import api from "./axios";
import type { Supplier, SupplierInput } from "../types/supplier";
export const getSuppliers = async () => (await api.get<Supplier[]>("/suppliers")).data;
export const createSupplier = async (data: SupplierInput) => (await api.post<Supplier>("/suppliers", data)).data;
export const updateSupplier = async (id: number, data: SupplierInput) => (await api.patch<Supplier>(`/suppliers/${id}`, data)).data;
