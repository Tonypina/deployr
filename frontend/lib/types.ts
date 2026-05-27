export type Role = "ADMIN" | "TECHNICIAN" | "CLIENT_USER";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type VisitStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId?: string;
  clientId?: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  taxId?: string;
  address?: string;
  companyId: string;
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
  clientId: string;
  _count?: { equipment: number; tickets: number };
}

export interface Equipment {
  id: string;
  name: string;
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
  client?: { id: string; name: string };
  branch?: { id: string; name: string; city?: string };
  equipment?: { id: string; name: string };
  technician?: { id: string; name: string };
  report?: { id: string } | null;
}

export interface TicketReport {
  id: string;
  findings: string;
  actions: string;
  partsUsed?: string;
  nextVisitDate?: string;
  techSignature?: string;
  clientSignature?: string;
  ticketId: string;
  createdAt: string;
}

export interface ScheduledVisit {
  id: string;
  requestedAt: string;
  notes?: string;
  status: VisitStatus;
  clientId: string;
  branchId?: string;
  ticketId?: string;
  client?: { id: string; name: string };
  branch?: { id: string; name: string; city?: string };
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
