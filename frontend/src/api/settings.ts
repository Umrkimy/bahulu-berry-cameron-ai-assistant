import api from "./axios";

export interface EmailConfigurationStatus {
  mode: "delivery" | "test" | "not_configured";
  delivery_enabled: boolean;
  sender: string | null;
  reset_link_expiry_minutes: number;
}

export async function getEmailConfigurationStatus() {
  return (await api.get<EmailConfigurationStatus>("/settings/email-status")).data;
}

export async function requestTeamPasswordReset(adminId: number) {
  return (await api.post<{ message: string }>(`/settings/password-reset/${adminId}`)).data;
}
