import { api } from "@/lib/api-client";
import { Client, Branch, Equipment } from "@/lib/types";

// ── Clients ──────────────────────────────────────────────────────────────────

export async function getClients(params?: { page?: number; limit?: number; search?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  const q = qs.toString();
  const res = await api.get<{ clients: Client[]; total: number; page: number; limit: number }>(`/api/clients${q ? `?${q}` : ""}`);
  return res.data!;
}

export async function getClient<T = Client>(id: string) {
  const res = await api.get<T>(`/api/clients/${id}`);
  return res.data!;
}

export interface ClientStats {
  total: number;
  branches: number;
  equipment: number;
  active: number;
}

export async function getClientStats(): Promise<ClientStats> {
  const res = await api.get<ClientStats>("/api/clients/stats");
  return res.data!;
}

export async function createClient(data: {
  name: string;
  giro?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
}) {
  const res = await api.post<{ id: string }>("/api/clients", data);
  return res.data!;
}

export async function updateClient(id: string, data: {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
}) {
  await api.put(`/api/clients/${id}`, data);
}

export async function deleteClient(id: string) {
  await api.del(`/api/clients/${id}`);
}

export async function assignClientTemplate(id: string, templateId: string | null) {
  await api.patch(`/api/clients/${id}/template`, { templateId });
}

// ── Branches ─────────────────────────────────────────────────────────────────

export async function getBranches(clientId: string) {
  const res = await api.get<Branch[]>(`/api/clients/${clientId}/branches`);
  return res.data ?? [];
}

export async function createBranch(clientId: string, data: {
  name: string;
  address: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  contactName?: string;
}) {
  await api.post(`/api/clients/${clientId}/branches`, data);
}

export async function updateBranch(clientId: string, branchId: string, data: {
  name: string;
  address: string;
  city?: string;
  phone?: string;
  contactEmail?: string;
  contactName?: string;
}) {
  await api.put(`/api/clients/${clientId}/branches/${branchId}`, data);
}

export async function deleteBranch(clientId: string, branchId: string) {
  await api.del(`/api/clients/${clientId}/branches/${branchId}`);
}

// ── Equipment ─────────────────────────────────────────────────────────────────

export async function getEquipment(clientId: string, branchId: string) {
  const res = await api.get<Equipment[]>(`/api/clients/${clientId}/branches/${branchId}/equipment`);
  return res.data ?? [];
}

export async function createEquipment(clientId: string, branchId: string, data: {
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
}) {
  await api.post(`/api/clients/${clientId}/branches/${branchId}/equipment`, data);
}

export async function updateEquipment(clientId: string, branchId: string, equipmentId: string, data: {
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
}) {
  await api.put(`/api/clients/${clientId}/branches/${branchId}/equipment/${equipmentId}`, data);
}

export async function deleteEquipment(clientId: string, branchId: string, equipmentId: string) {
  await api.del(`/api/clients/${clientId}/branches/${branchId}/equipment/${equipmentId}`);
}

// ── Portal users ──────────────────────────────────────────────────────────────

export async function createPortalUser(clientId: string, data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  await api.post(`/api/clients/${clientId}/users`, data);
}

export async function resetPortalUserPassword(clientId: string, userId: string, password: string) {
  await api.put(`/api/clients/${clientId}/users/${userId}/password`, { password });
}
