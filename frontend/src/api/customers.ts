import api from "./axios";

export interface Customer {
  id: number;
  full_name: string;
  phone_number: string;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  created_at: string;
}

export interface CreateCustomerData {
  full_name: string;
  phone_number: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country: string;
}
export interface UpdateCustomerData {
  full_name?: string;
  phone_number?: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

export async function getCustomers() {
  const response = await api.get<Customer[]>("/customers/");

  return response.data;
}

export async function createCustomer(data: CreateCustomerData) {
  const response = await api.post<Customer>("/customers/", data);

  return response.data;
}

export async function updateCustomer(
  customerId: number,
  data: UpdateCustomerData,
) {
  const response = await api.patch<Customer>(`/customers/${customerId}`, data);

  return response.data;
}
