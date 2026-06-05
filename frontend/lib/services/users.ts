import { api } from "@/lib/api-client";
import { Technician } from "@/lib/types";

export async function getTechnicians(params?: { limit?: number; page?: number }) {
  const qs = new URLSearchParams({ role: "TECHNICIAN" });
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.page) qs.set("page", String(params.page));
  const res = await api.get<{ users: Technician[]; total: number; page: number; limit: number }>(`/api/users?${qs}`);
  return res.data!;
}

export async function createTechnician(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  expertise?: string;
}) {
  await api.post("/api/users", { ...data, role: "TECHNICIAN" });
}

export async function getAdmins(params?: { limit?: number; page?: number }) {
  const qs = new URLSearchParams({ role: "ADMIN" });
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.page)  qs.set("page",  String(params.page));
  const res = await api.get<{ users: Technician[]; total: number; page: number; limit: number }>(`/api/users?${qs}`);
  return res.data!;
}

export async function createAdmin(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  await api.post("/api/users", { ...data, role: "ADMIN" });
}

export async function updateUser(id: string, data: {
  name?: string;
  email?: string;
  phone?: string | null;
  expertise?: string | null;
  isActive?: boolean;
}) {
  await api.put(`/api/users/${id}`, data);
}

export async function resetUserPassword(id: string, password: string) {
  await api.put(`/api/users/${id}/password`, { password });
}
