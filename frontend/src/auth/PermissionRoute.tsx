import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import useAuth from "./useAuth";
import { can, type Permission } from "./permissions";

export default function PermissionRoute({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { admin } = useAuth();
  return can(admin, permission) ? children : <Navigate to="/dashboard" replace />;
}
