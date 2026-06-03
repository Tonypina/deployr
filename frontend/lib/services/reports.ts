import { api } from "@/lib/api-client";
import { TicketReport, ReportTemplate, ReportTemplateField } from "@/lib/types";

export type TemplateWithFields = ReportTemplate & { fields: ReportTemplateField[] };

export async function getReport(ticketId: string) {
  const res = await api.get<TicketReport>(`/api/tickets/${ticketId}/report`);
  return res.data!;
}

export async function submitReport(
  ticketId: string,
  responses: Record<string, string>,
  extra?: { requiresSpareParts?: boolean; spareParts?: { inventoryItemId: string; quantity: number }[] }
) {
  const res = await api.post<TicketReport>(`/api/tickets/${ticketId}/report`, { responses, ...extra });
  return res.data!;
}

export async function getTemplateForTicket(ticketId: string) {
  const res = await api.get<TemplateWithFields>(`/api/report-templates/for-ticket/${ticketId}`);
  return res.data!;
}

export async function updateReport(
  ticketId: string,
  responses: Record<string, string>,
  extra?: { requiresSpareParts?: boolean; spareParts?: { inventoryItemId: string; quantity: number }[] }
) {
  const res = await api.put<TicketReport>(`/api/tickets/${ticketId}/report`, { responses, ...extra });
  return res.data!;
}
