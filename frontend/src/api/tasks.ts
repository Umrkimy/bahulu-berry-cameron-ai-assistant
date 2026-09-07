import api from "./axios";
export type TaskContextType = "ORDER" | "DELIVERY" | "INVENTORY";
export interface Task { id:number; title:string; description:string|null; priority:"LOW"|"NORMAL"|"HIGH"; status:"OPEN"|"IN_PROGRESS"|"COMPLETED"; due_at:string|null; assigned_admin_id:number|null; created_by_admin_id:number; context_type:TaskContextType|null; context_id:number|null; context_label:string|null; completion_note:string|null; completed_at:string|null; created_at:string; updated_at:string }
export const getTasks=async()=> (await api.get<Task[]>("/tasks")).data;
export const createTask=async(data:Record<string, unknown>)=>(await api.post<Task>("/tasks",data)).data;
export const updateTask=async(id:number,data:Partial<Task>)=>(await api.patch<Task>(`/tasks/${id}`,data)).data;
