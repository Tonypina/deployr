import { api } from "@/lib/api-client";
import { Policy, Ticket } from "@/lib/types";

export async function listPolicies(params?: { page?: number; limit?: number; search?: string; clientId?: string; status?: string }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.clientId) qs.set("clientId", params.clientId);
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  const res = await api.get<{ policies: Policy[]; total: number; page: number; limit: number }>(`/api/policies${q ? `?${q}` : ""}`);
  return res.data!;
}

export async function getPolicy(id: string): Promise<Policy> {
  const res = await api.get<Policy>(`/api/policies/${id}`);
  return res.data!;
}

export async function createPolicy(data: {
  name: string;
  clientId: string;
  startDate: string;
  endDate: string;
  recurrence: string;
  notes?: string;
  equipmentIds: { equipmentId: string; branchId: string }[];
}): Promise<Policy> {
  const res = await api.post<Policy>("/api/policies", data);
  return res.data!;
}

export async function updatePolicy(id: string, data: { name?: string; notes?: string; endDate?: string }): Promise<Policy> {
  const res = await api.put<Policy>(`/api/policies/${id}`, data);
  return res.data!;
}

export async function cancelPolicy(id: string): Promise<Policy> {
  const res = await api.patch<Policy>(`/api/policies/${id}/cancel`, {});
  return res.data!;
}

export async function deletePolicy(id: string): Promise<void> {
  await api.del(`/api/policies/${id}`);
}

export async function getUpcomingPolicyTickets(): Promise<Ticket[]> {
  const res = await api.get<Ticket[]>("/api/policies/upcoming-tickets");
  return res.data ?? [];
}
