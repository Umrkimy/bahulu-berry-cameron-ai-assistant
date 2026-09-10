import api from "./axios";
import type { Task } from "./tasks";

export type EnquirySource = "WHATSAPP" | "CALL" | "WALK_IN" | "SOCIAL" | "OTHER";
export type EnquiryStatus = "NEW" | "WORKING" | "RESOLVED" | "SPAM";

export interface Enquiry {
  id: number;
  title: string;
  notes: string;
  source: EnquirySource;
  contact_name: string | null;
  reply_contact: string | null;
  status: EnquiryStatus;
  created_by_admin_id: number;
  status_updated_by_admin_id: number | null;
  status_updated_at: string | null;
  task_id: number | null;
  task: Task | null;
  created_at: string;
  updated_at: string;
}

export interface EnquiryInput {
  title: string;
  notes: string;
  source: EnquirySource;
  contact_name?: string | null;
  reply_contact?: string | null;
}

export interface EnquiryTaskInput {
  title: string;
  instructions: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  due_at?: string | null;
  assigned_admin_id?: number | null;
}

export const getEnquiries = async (params: { status?: EnquiryStatus; source?: EnquirySource } = {}) => (await api.get<Enquiry[]>("/enquiries", { params })).data;
export const getEnquirySummary = async () => (await api.get<Record<EnquiryStatus, number>>("/enquiries/summary")).data;
export const createEnquiry = async (data: EnquiryInput) => (await api.post<Enquiry>("/enquiries", data)).data;
export const updateEnquiry = async (id: number, data: EnquiryInput) => (await api.patch<Enquiry>(`/enquiries/${id}`, data)).data;
export const updateEnquiryStatus = async (id: number, status: Exclude<EnquiryStatus, "NEW">) => (await api.patch<Enquiry>(`/enquiries/${id}/status`, { status })).data;
export const createEnquiryTask = async (id: number, data: EnquiryTaskInput) => (await api.post<Enquiry>(`/enquiries/${id}/task`, data)).data;
