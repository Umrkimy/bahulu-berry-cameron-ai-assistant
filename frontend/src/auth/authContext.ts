import { createContext } from "react";

export interface Admin {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  role: "OWNER" | "STAFF";
  is_active: boolean;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  admin: Admin | null;
  loading: boolean;

  login: (nextAdmin: Admin) => void;
  logout: () => void;
}

// Kept apart from AuthProvider so that file exports only components (Fast Refresh).
export const AuthContext = createContext<AuthContextType | null>(null);
