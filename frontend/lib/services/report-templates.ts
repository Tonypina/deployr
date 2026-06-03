import { api } from "@/lib/api-client";
import { ReportTemplate, ReportTemplateField, FieldType } from "@/lib/types";

export type TemplateDetail = ReportTemplate & {
  fields: ReportTemplateField[];
  _count: { clients: number };
};

export async function getTemplates() {
  const res = await api.get<ReportTemplate[]>("/api/report-templates");
  return res.data ?? [];
}

export async function getTemplate(id: string) {
  const res = await api.get<TemplateDetail>(`/api/report-templates/${id}`);
  return res.data!;
}

export async function createTemplate(data: { name: string; description?: string }) {
  const res = await api.post<ReportTemplate>("/api/report-templates", data);
  return res.data!;
}

export async function updateTemplate(id: string, data: { name: string; description?: string }) {
  await api.put(`/api/report-templates/${id}`, data);
}

export async function deleteTemplate(id: string) {
  await api.del(`/api/report-templates/${id}`);
}

export async function setDefaultTemplate(id: string) {
  await api.patch(`/api/report-templates/${id}/set-default`, {});
}

export async function addTemplateField(templateId: string, data: {
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[];
}) {
  await api.post(`/api/report-templates/${templateId}/fields`, data);
}

export async function updateTemplateField(templateId: string, fieldId: string, data: {
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[];
}) {
  await api.put(`/api/report-templates/${templateId}/fields/${fieldId}`, data);
}

export async function deleteTemplateField(templateId: string, fieldId: string) {
  await api.del(`/api/report-templates/${templateId}/fields/${fieldId}`);
}
