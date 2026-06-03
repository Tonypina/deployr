export type Role = "ADMIN" | "TECHNICIAN" | "CLIENT_USER";
export type PolicyStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type Recurrence = "MONTHLY" | "BIMONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";
export type FieldType = "TEXT" | "TEXTAREA" | "DATE" | "NUMBER" | "PHOTO" | "MULTISELECT";
export type TicketStatus = "PENDING" | "ASSIGNED" | "ON_SITE" | "IN_PROGRESS" | "PENDING_REPORT" | "COMPLETED" | "CLOSED" | "CANCELLED" | "EXPIRED" | "REVIEW" | "PENDING_APPROVAL" | "REOPENED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId?: string;
  clientId?: string;
  mustChangePassword?: boolean;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  rfc?: string;
  razonSocial?: string;
  regimenFiscal?: string;
  codigoPostal?: string;
  giro?: string;
  createdAt: string;
}

export interface ReportTemplateField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  options: string[];
  templateId: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  companyId: string;
  fields?: ReportTemplateField[];
  _count?: { clients: number; fields: number };
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  taxId?: string;
  address?: string;
  companyId: string;
  templateId?: string;
  template?: ReportTemplate;
  createdAt: string;
  _count?: { branches: number; tickets: number };
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  contactName?: string;
  contactEmail?: string;
  clientId: string;
  _count?: { equipment: number; tickets: number };
}

export interface Equipment {
  id: string;
  name: string;
  brand?: string;
  serialNumber?: string;
  model?: string;
  notes?: string;
  installedAt?: string;
  productId?: string;
  branchId: string;
  product?: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  _count?: { equipment: number };
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  mustChangePassword?: boolean;
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface TicketReportSparePart {
  id: string;
  reportId: string;
  inventoryItemId: string;
  inventoryItem: { id: string; name: string; unit?: string | null };
  quantity: number;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  status: TicketStatus;
  changedAt: string;
  changedBy?: string | null;
}

export interface Ticket {
  id: string;
  title: string;
  description?: string;
  status: TicketStatus;
  priority: Priority;
  scheduledAt?: string;
  startedAt?: string;
  closedAt?: string;
  createdAt: string;
  clientId: string;
  branchId?: string;
  equipmentId?: string;
  technicianId?: string;
  reviewDocument?: string | null;
  parentTicketId?: string | null;
  client?: { id: string; name: string };
  branch?: { id: string; name: string; city?: string };
  equipment?: { id: string; name: string };
  technician?: { id: string; name: string };
  report?: { id: string } | null;
  policyId?: string | null;
  policy?: { id: string; name: string } | null;
  statusHistory?: TicketStatusHistory[];
}

export interface TicketReport {
  id: string;
  responses: Record<string, string>;
  requiresSpareParts: boolean;
  spareParts?: TicketReportSparePart[];
  templateId: string;
  template?: ReportTemplate & { fields: ReportTemplateField[] };
  techSignature?: string;
  clientSignature?: string;
  ticketId: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  quantity: number;
  unit?: string;
  minStock?: number;
  companyId: string;
}

export interface PolicyEquipmentItem {
  id: string;
  policyId: string;
  equipmentId: string;
  branchId: string;
  equipment: { id: string; name: string; brand?: string };
  branch: { id: string; name: string; city?: string };
}

export interface Policy {
  id: string;
  name: string;
  status: PolicyStatus;
  startDate: string;
  endDate: string;
  totalTickets: number;
  recurrence: Recurrence;
  notes?: string;
  clientId: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  client?: { id: string; name: string };
  equipment?: PolicyEquipmentItem[];
  tickets?: Pick<Ticket, "id" | "title" | "status" | "scheduledAt" | "priority">[];
  _count?: { tickets: number };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}
