import api from "./axios";

export type TeamRole = "OWNER" | "STAFF";

export interface TeamMember {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  role: TeamRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberInput {
  username: string;
  email: string;
  password: string;
  role: TeamRole;
}

export async function getTeam() { return (await api.get<TeamMember[]>("/team")).data; }
export async function createTeamMember(data: TeamMemberInput) { return (await api.post<TeamMember>("/team", data)).data; }
export async function updateTeamMember(id: number, data: Partial<TeamMemberInput> & { is_active?: boolean }) { return (await api.patch<TeamMember>(`/team/${id}`, data)).data; }
