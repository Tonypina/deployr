import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Priority, TicketStatus, VisitStatus } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export const statusLabel: Record<TicketStatus, string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
  EXPIRED: "Vencido",
};

export const statusColor: Record<TicketStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ASSIGNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  EXPIRED: "bg-red-100 text-red-700",
};

export const priorityLabel: Record<Priority, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export const priorityColor: Record<Priority, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export const visitStatusLabel: Record<VisitStatus, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};
