import { createContext, useEffect, useState, useCallback } from "react";

import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ensureCsrfToken, getCurrentAdmin, logoutRequest } from "../api/auth";

interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  role: "OWNER" | "STAFF";
  is_active: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  admin: Admin | null;
  loading: boolean;

  login: (nextAdmin: Admin) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [admin, setAdmin] = useState<Admin | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    void logoutRequest().catch(() => undefined);
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("bahulu-cameron-ai-")) sessionStorage.removeItem(key);
    }
    localStorage.removeItem("bahulu-cameron-ai-chat");
    localStorage.removeItem("bahulu-cameron-ai-conversation-id");
    setIsAuthenticated(false);
    setAdmin(null);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback((nextAdmin: Admin) => {
    queryClient.clear();
    setAdmin(nextAdmin);
    setIsAuthenticated(true);
  }, [queryClient]);

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      try {
        await ensureCsrfToken();
        const user = await getCurrentAdmin();

        if (!ignore) {
          setAdmin(user);
          setIsAuthenticated(true);
        }
      } catch {
        if (!ignore) {
          setIsAuthenticated(false);
          setAdmin(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,

        admin,

        loading,

        login,

        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
