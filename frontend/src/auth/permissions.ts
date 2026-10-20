export type Role = "OWNER" | "MANAGER" | "STAFF";

export type Permission =
  | "tasks.manage"
  | "orders.cancel"
  | "enquiries.view"
  | "enquiries.update"
  | "enquiries.manage"
  | "suppliers.manage"
  | "inventory.opening_balance"
  | "customers.archive"
  | "products.manage"
  | "reports.view";

// Mirrors backend/app/auth/permissions.py. The API enforces it; this only hides controls.
const staff: Permission[] = ["enquiries.view", "enquiries.update"];
const manager: Permission[] = [
  ...staff,
  "tasks.manage",
  "orders.cancel",
  "enquiries.manage",
  "suppliers.manage",
  "inventory.opening_balance",
  "customers.archive",
  "products.manage",
  "reports.view",
];

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set(manager),
  MANAGER: new Set(manager),
  STAFF: new Set(staff),
};

export const roleLabels: Record<Role, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

export function isOwner(admin: { role: Role } | null | undefined): boolean {
  return admin?.role === "OWNER";
}

export function can(admin: { role: Role } | null | undefined, permission: Permission): boolean {
  return Boolean(admin && rolePermissions[admin.role]?.has(permission));
}
