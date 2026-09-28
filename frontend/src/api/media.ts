import api from "./axios";
import type { MediaAsset, MediaPage } from "../types/media";

export async function getMedia(params: { search?: string; status?: "active" | "archived" | "all"; page?: number; page_size?: number } = {}) {
  return (await api.get<MediaPage>("/media", { params })).data;
}

export async function uploadMedia(file: File) {
  const data = new FormData();
  data.append("file", file);
  return (await api.post<MediaAsset>("/media", data, { headers: { "Content-Type": "multipart/form-data" } })).data;
}

export async function updateMedia(id: number, values: { title: string; note: string | null }) {
  return (await api.patch<MediaAsset>(`/media/${id}`, values)).data;
}

export async function setMediaArchived(id: number, archived: boolean) {
  return (await api.post<MediaAsset>(`/media/${id}/${archived ? "archive" : "restore"}`)).data;
}

export async function deleteMedia(id: number) {
  await api.delete(`/media/${id}`);
}

export function mediaUrl(path: string) {
  const origin = String(api.defaults.baseURL ?? "/api").replace(/\/api\/?$/, "");
  return `${origin}${path}`;
}
