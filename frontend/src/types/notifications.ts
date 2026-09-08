export type NotificationType = "TASK" | "SUPPORT" | "REFUND" | "PAYMENT" | "INVENTORY";

export interface AppNotification {
  id: number;
  notification_type: NotificationType;
  title: string;
  description: string;
  route: string;
  entity_type: string | null;
  entity_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPage {
  items: AppNotification[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
