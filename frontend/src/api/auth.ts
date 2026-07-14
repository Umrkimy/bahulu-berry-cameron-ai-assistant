import api from "./axios";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
}

export async function getCurrentAdmin() {
  const response = await api.get<Admin>("/auth/me");

  return response.data;
}

export async function loginRequest(email: string, password: string) {
  const formData = new URLSearchParams();

  formData.append("username", email);

  formData.append("password", password);

  const response = await api.post<LoginResponse>("/auth/token", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}
