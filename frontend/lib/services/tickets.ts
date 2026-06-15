import { api } from "@/lib/api-client";
import { Ticket, PreviousService } from "@/lib/types";

export async function getTickets(params?: {
  status?: string;
  limit?: number;
  page?: number;
  year?: number;
  from?: string;
  to?: string;
  search?: string;
  clientId?: string;
  technicianId?: string;
  branchId?: string;
  equipmentId?: string;
  orderBy?: "createdAt" | "updatedAt";
}) {
  const qs = new URLSearchParams();
  if (params?.status)      qs.set("status",      params.status);
  if (params?.limit)       qs.set("limit",        String(params.limit));
  if (params?.page)        qs.set("page",         String(params.page));
  if (params?.year)        qs.set("year",         String(params.year));
  if (params?.from)        qs.set("from",         params.from);
  if (params?.to)          qs.set("to",           params.to);
  if (params?.search)      qs.set("search",       params.search);
  if (params?.clientId)    qs.set("clientId",     params.clientId);
  if (params?.technicianId) qs.set("technicianId", params.technicianId);
  if (params?.branchId)    qs.set("branchId",     params.branchId);
  if (params?.equipmentId) qs.set("equipmentId",  params.equipmentId);
  if (params?.orderBy)     qs.set("orderBy",      params.orderBy);
  const q = qs.toString();
  const res = await api.get<{ tickets: Ticket[]; total: number; page: number; limit: number }>(`/api/tickets${q ? `?${q}` : ""}`);
  return res.data!;
}

export async function getTicket(id: string) {
  const res = await api.get<Ticket>(`/api/tickets/${id}`);
  return res.data!;
}

// Most recent prior serviced ticket for the same equipment (with its report), or null.
export async function getPreviousService(id: string) {
  const res = await api.get<PreviousService | null>(`/api/tickets/${id}/previous-service`);
  return res.data ?? null;
}

export async function createTicket(data: {
  title: string;
  description?: string;
  priority: string;
  clientId?: string;
  branchId?: string;
  equipmentId?: string;
  scheduledAt?: string;
}) {
  const res = await api.post<Ticket>("/api/tickets", data);
  return res.data!;
}

// Admin uploads/updates the quotation document while the ticket is REQUESTED.
export async function setQuotation(id: string, quotationDocument: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/quotation`, { quotationDocument });
  return res.data!;
}

// Admin sends the quotation for client approval (REQUESTED → PENDING_CLIENT_APPROVAL).
export async function sendQuotation(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/send-quotation`, {});
  return res.data!;
}

// Admin or client rejects the quotation (PENDING_CLIENT_APPROVAL → REQUESTED).
export async function rejectTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/reject`, {});
  return res.data!;
}

export async function assignTicket(id: string, data: { technicianId: string; scheduledAt?: string }) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/assign`, data);
  return res.data!;
}

export async function checkinTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/checkin`, {});
  return res.data!;
}

export async function startTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/start`, {});
  return res.data!;
}

export async function finishTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/finish`, {});
  return res.data!;
}

export async function closeTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/close`, {});
  return res.data!;
}

export async function cancelTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/cancel`, {});
  return res.data!;
}

export async function submitReview(id: string, reviewDocument: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/submit-review`, { reviewDocument });
  return res.data!;
}

export async function approveTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/approve`, {});
  return res.data!;
}

export async function reopenTicket(id: string) {
  const res = await api.patch<Ticket>(`/api/tickets/${id}/reopen`, {});
  return res.data!;
}

export interface BranchTimeAnalytics {
  branchId: string;
  branchName: string;
  avgByStatus: Record<string, number>;
}

export interface ClientTimeAnalytics {
  clientId: string;
  clientName: string;
  avgByStatus: Record<string, number>;
  branches: BranchTimeAnalytics[];
}

export async function getTimeAnalytics(): Promise<ClientTimeAnalytics[]> {
  const res = await api.get<ClientTimeAnalytics[]>("/api/tickets/time-analytics");
  return res.data ?? [];
}
