import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import useAuth from "./useAuth";

export default function OwnerRoute({ children }: { children: ReactNode }) {
  const { admin } = useAuth();
  return admin?.role === "OWNER" ? children : <Navigate to="/dashboard" replace />;
}
