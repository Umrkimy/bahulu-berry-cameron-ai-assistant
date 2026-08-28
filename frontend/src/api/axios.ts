import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const isUnsafeRequest = !["get", "head", "options"].includes(
    (config.method ?? "get").toLowerCase(),
  );
  const csrfToken = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("bbc_csrf_token="))
    ?.split("=")[1];

  if (isUnsafeRequest && csrfToken) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(csrfToken);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
    return Promise.reject(error);
  },
);

export default api;
