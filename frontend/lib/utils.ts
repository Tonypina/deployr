import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PolicyStatus, Priority, Recurrence, TicketStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export const statusLabel: Record<TicketStatus, string> = {
  REQUESTED: "Solicitado",
  PENDING_CLIENT_APPROVAL: "Aprobación del cliente",
  PENDING_ASSIGN: "Por asignar",
  ASSIGNED: "Asignado",
  ON_SITE: "En sitio",
  IN_PROGRESS: "En progreso",
  PENDING_REPORT: "Reporte pendiente",
  COMPLETED: "Completado",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
  REVIEW: "En revisión",
  PENDING_APPROVAL: "Aprobación pendiente",
  REOPENED: "Reabierto",
};

export const statusColor: Record<TicketStatus, string> = {
  REQUESTED: "bg-yellow-500/15 text-yellow-300",
  PENDING_CLIENT_APPROVAL: "bg-amber-500/15 text-amber-300",
  PENDING_ASSIGN: "bg-sky-500/15 text-sky-300",
  ASSIGNED: "bg-blue-500/15 text-blue-300",
  ON_SITE: "bg-cyan-500/15 text-cyan-300",
  IN_PROGRESS: "bg-orange-500/15 text-orange-300",
  PENDING_REPORT: "bg-violet-500/15 text-violet-300",
  COMPLETED: "bg-emerald-500/15 text-emerald-300",
  CLOSED: "bg-white/10 text-white/50",
  CANCELLED: "bg-white/8 text-white/40",
  EXPIRED: "bg-red-500/15 text-red-300",
  REVIEW: "bg-purple-500/15 text-purple-300",
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-300",
  REOPENED: "bg-rose-500/15 text-rose-300",
};

export const priorityLabel: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const priorityColor: Record<Priority, string> = {
  LOW: "bg-white/10 text-white/60",
  MEDIUM: "bg-blue-500/15 text-blue-300",
  HIGH: "bg-orange-500/15 text-orange-300",
  URGENT: "bg-red-500/20 text-red-300",
};

export const policyStatusLabel: Record<PolicyStatus, string> = {
  ACTIVE: "Activa",
  EXPIRED: "Vencida",
  CANCELLED: "Cancelada",
};

export const policyStatusColor: Record<PolicyStatus, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300",
  EXPIRED: "bg-white/10 text-white/50",
  CANCELLED: "bg-red-500/15 text-red-300",
};

export const recurrenceLabel: Record<Recurrence, string> = {
  MONTHLY: "Mensual",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};
