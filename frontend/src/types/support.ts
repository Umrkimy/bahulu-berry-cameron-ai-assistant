export type SupportStatus = "NEW" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "RESOLVED" | "CLOSED";
export type HandoffState = "AI_ACTIVE" | "HUMAN_REQUESTED" | "HUMAN_HANDLING";
export interface SupportRequest { id:number; customer_id:number|null; customer_name:string; contact:string|null; source:string; subject:string; notes:string|null; handoff_reason:string|null; priority:"LOW"|"NORMAL"|"HIGH"|"URGENT"; status:SupportStatus; handoff_state:HandoffState; assigned_admin_id:number|null; created_at:string; updated_at:string; }
export type SupportRequestInput = Omit<SupportRequest, "id" | "created_at" | "updated_at" | "handoff_state">;
export interface SupportRequestPage { items: SupportRequest[]; page: number; page_size: number; total: number; total_pages: number; }
export interface SupportRequestNote { id: number; support_request_id: number; author_admin_id: number; content: string; created_at: string; }
export interface SupportFAQ { id:number; category:string; question_en:string; answer_en:string; question_ms:string|null; answer_ms:string|null; is_active:boolean; updated_at:string; }
export interface SupportTemplate { id:number; category:string; name:string; content_en:string; content_ms:string|null; is_active:boolean; updated_at:string; }
export interface HandoffRule { id:number; trigger:string; description:string; is_active:boolean; updated_at:string; }
export interface SupportDraftSource { type:"FAQ"|"TEMPLATE"; id:number; label:string; }
export interface SupportDraft { reply:string|null; language:"EN"|"MS"; handoff_required:boolean; handoff_reason:string|null; sources:SupportDraftSource[]; prompt_version:string; model:string; latency_ms:number; }
export interface SimulatorInboundResult { outcome: "DRAFTED" | "HANDOFF" | "DUPLICATE"; duplicate: boolean; support_request_id: number | null; ticket_created: boolean; draft: SupportDraft | null; }
export interface MetaConnectionStatus { provider: "META_WHATSAPP_CLOUD_API"; inbound_enabled: boolean; webhook_url: string; app_secret_configured: boolean; verify_token_configured: boolean; phone_number_configured: boolean; outbound_enabled: false; mode: "DRAFT_ONLY"; }
export interface SupportMessagingConversation { id: number; provider: string; support_request_id: number; }
export interface SupportMessage { id:number; direction:"INBOUND"|"OUTBOUND"; outcome:string; content:string|null; author_admin_id:number|null; processed_at:string; expires_at:string|null; }
