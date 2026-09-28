export interface MediaUsage {
  product_id: number;
  product_name: string;
  placement_id: number;
  position: number;
}

export interface MediaAsset {
  id: number;
  title: string;
  note: string | null;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  byte_size: number | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  usage_count: number;
  usages: MediaUsage[];
  content_path: string;
  was_reused: boolean;
}

export interface MediaPage {
  items: MediaAsset[];
  page: number;
  page_size: number;
  total: number;
  pages: number;
}
