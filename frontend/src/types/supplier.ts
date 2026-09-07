export interface Supplier { id: number; name: string; contact_name: string | null; phone: string | null; email: string | null; note: string | null; is_active: boolean; created_at: string; updated_at: string; }
export type SupplierInput = Omit<Supplier, "id" | "created_at" | "updated_at">;
