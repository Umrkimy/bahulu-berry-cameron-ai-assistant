import { createContext, useEffect, useState, useCallback } from "react";

import type { ReactNode } from "react";

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

  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [admin, setAdmin] = useState<Admin | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    void logoutRequest().catch(() => undefined);
    setIsAuthenticated(false);
    setAdmin(null);
  }, []);

  const login = useCallback(() => setIsAuthenticated(true), []);

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
