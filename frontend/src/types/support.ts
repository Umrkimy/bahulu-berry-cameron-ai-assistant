export type SupportStatus = "NEW" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";
export interface SupportRequest { id:number; customer_id:number|null; customer_name:string; contact:string|null; source:string; subject:string; notes:string|null; handoff_reason:string|null; priority:"LOW"|"NORMAL"|"HIGH"|"URGENT"; status:SupportStatus; assigned_admin_id:number|null; created_at:string; updated_at:string; }
export interface SupportFAQ { id:number; category:string; question_en:string; answer_en:string; question_ms:string|null; answer_ms:string|null; is_active:boolean; updated_at:string; }
export interface SupportTemplate { id:number; category:string; name:string; content_en:string; content_ms:string|null; is_active:boolean; updated_at:string; }
export interface HandoffRule { id:number; trigger:string; description:string; is_active:boolean; updated_at:string; }
