import api from "./axios";

export interface LoginResponse {
  authenticated: boolean;
}

export interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  role: "OWNER" | "STAFF";
  is_active: boolean;
}

export async function getCurrentAdmin() {
  const response = await api.get<Admin>("/auth/me");

  return response.data;
}

export async function loginRequest(email: string, password: string) {
  await ensureCsrfToken();
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

export async function ensureCsrfToken() {
  await api.get("/auth/csrf");
}

export async function logoutRequest() {
  await api.post("/auth/logout");
}
