export type OperationAlertCategory = "INVENTORY" | "ORDER" | "SUPPORT" | "REFUND";
export type OperationAlertSeverity = "CRITICAL" | "WARNING";

export interface OperationAlert {
  id: string;
  category: OperationAlertCategory;
  severity: OperationAlertSeverity;
  title: string;
  description: string;
  source_at: string;
  href: string;
}

export interface OperationAlertPage {
  items: OperationAlert[];
  total: number;
  limit: number;
  offset: number;
  counts: {
    total: number;
    critical: number;
    warning: number;
  };
}

export interface OperationAlertFilters {
  category?: OperationAlertCategory | null;
  severity?: OperationAlertSeverity | null;
  search?: string;
  limit?: number;
  offset?: number;
}
