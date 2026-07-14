import api from "./axios";

export interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
}

export async function getCustomers() {
  const response = await api.get<Customer[]>("/customers");

  return response.data;
}
