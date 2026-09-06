import api from "./axios";

export interface AIUsageRecord {
  id: number;
  admin_id: number | null;
  source: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  outcome: "RESERVED" | "COMPLETED" | "FAILED";
  created_at: string;
}

export interface AIUsageSummary {
  budget_usd: number;
  budget_rm_display: number;
  spent_usd: number;
  spent_rm_display: number;
  remaining_usd: number;
  percent_used: number;
  warning_threshold_percent: number;
  warning: boolean;
  month_start: string;
  by_admin: Array<{ admin_id: number | null; username: string; estimated_cost_usd: number }>;
  daily: Array<{ date: string; estimated_cost_usd: number }>;
}

export async function getAIUsageSummary() {
  return (await api.get<AIUsageSummary>("/ai-usage/summary")).data;
}

export async function getAIUsage() {
  return (await api.get<AIUsageRecord[]>("/ai-usage")).data;
}
