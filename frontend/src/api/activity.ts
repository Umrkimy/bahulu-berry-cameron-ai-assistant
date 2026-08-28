import api from "./axios";

export interface Activity {
  id: number;
  admin_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityFilters {
  entity_type?: string;
  action?: string;
  limit?: number;
  offset?: number;
}

export async function getActivity(filters: ActivityFilters = {}) {
  const response = await api.get<Activity[]>("/activity", { params: filters });
  return response.data;
}
