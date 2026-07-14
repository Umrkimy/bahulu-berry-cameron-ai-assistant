import { createContext, useEffect, useState, useCallback } from "react";

import type { ReactNode } from "react";

import { getCurrentAdmin } from "../api/auth";

interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
}

interface AuthContextType {
  token: string | null;
  admin: Admin | null;
  loading: boolean;

  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem("access_token"),
  );

  const [admin, setAdmin] = useState<Admin | null>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");

    setToken(null);

    setAdmin(null);
  }, []);

  const login = useCallback((newToken: string) => {
    localStorage.setItem("access_token", newToken);

    setToken(newToken);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function checkAuth() {
      if (!token) {
        setLoading(false);

        return;
      }

      try {
        const user = await getCurrentAdmin();

        if (!ignore) {
          setAdmin(user);
        }
      } catch {
        logout();
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
  }, [token, logout]);

  return (
    <AuthContext.Provider
      value={{
        token,

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
