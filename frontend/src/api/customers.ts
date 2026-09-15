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
  tags: string | null;
  internal_note: string | null;
  follow_up_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
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
  tags?: string | null;
  internal_note?: string | null;
  follow_up_at?: string | null;
}

export type CustomerStatus = "active" | "archived";

export async function getCustomersByStatus(customerStatus: CustomerStatus) {
  const response = await api.get<Customer[]>("/customers/", { params: { status: customerStatus } });

  return response.data;
}

export async function getCustomers() {
  return getCustomersByStatus("active");
}

export async function archiveCustomer(customerId: number) {
  const response = await api.post<Customer>(`/customers/${customerId}/archive`);
  return response.data;
}

export async function restoreCustomer(customerId: number) {
  const response = await api.post<Customer>(`/customers/${customerId}/restore`);
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
