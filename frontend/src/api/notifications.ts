import api from "./axios";
import type { AppNotification, NotificationPage, NotificationType } from "../types/notifications";

export interface NotificationFilters {
  unread_only?: boolean;
  notification_type?: NotificationType | null;
  start_at?: string;
  end_at?: string;
  page?: number;
  page_size?: number;
}

export const getNotifications = async (filters: NotificationFilters = {}) =>
  (await api.get<NotificationPage>("/notifications", { params: filters })).data;

export const getUnreadNotificationCount = async () =>
  (await api.get<{ unread_count: number }>("/notifications/unread-count")).data;

export const markNotificationRead = async (id: number) =>
  (await api.patch<AppNotification>(`/notifications/${id}/read`)).data;

export const markAllNotificationsRead = async () => api.post("/notifications/read-all");
