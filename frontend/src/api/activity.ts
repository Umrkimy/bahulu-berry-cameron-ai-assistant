import api from "./axios";

export interface Activity {
  id: number;
  admin_id: number | null;
  admin_username: string | null;
  action: string;
  entity_type: string;
  entity_id: number | null;
  description: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ActivityFilters {
  entity_type?: string;
  entity_id?: number;
  action?: string;
  admin_id?: number;
  start_at?: string;
  end_at?: string;
  limit?: number;
  offset?: number;
}

export interface ActivityList {
  items: Activity[];
  total: number;
}

export async function getActivity(filters: ActivityFilters = {}) {
  const response = await api.get<ActivityList>("/activity", { params: filters });
  return response.data;
}
