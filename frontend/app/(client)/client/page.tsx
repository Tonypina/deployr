"use client";

import Link from "next/link";
import {
  Truck, Wrench, History, Plus, ChevronRight,
  CheckCircle2, AlertTriangle, XCircle, FileText,
} from "lucide-react";
import { cn, statusColor, statusLabel, formatDate } from "@/lib/utils";
import { useTickets } from "@/lib/hooks/use-tickets";
import { useClientPortal } from "@/lib/hooks/use-client-portal";
import { useAuthStore } from "@/lib/auth-store";
import { Ticket } from "@/lib/types";

const ACTIVE_STATUSES = new Set(["ASSIGNED", "IN_PROGRESS"]);
const DONE_STATUSES   = new Set(["COMPLETED", "CLOSED", "CANCELLED", "EXPIRED", "REVIEW", "PENDING_APPROVAL"]);

const AVATAR_COLORS = [
  { bg: "bg-primary/20",      text: "text-primary"      },
  { bg: "bg-amber-accent/20", text: "text-amber-accent" },
  { bg: "bg-tertiary/20",     text: "text-tertiary"     },
];

function techInitials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function StatusBadge({ ticket }: { ticket: Ticket }) {
  return (
    <span className={cn(
      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
      ticket.status === "IN_PROGRESS"
        ? "bg-secondary-container/10 text-amber-accent"
        : "bg-primary/10 text-primary"
    )}>
      {ticket.status === "IN_PROGRESS" ? "En progreso" : "Asignado"}
    </span>
  );
}

export default function ClientDashboard() {
  const { user }  = useAuthStore();
  const { tickets, loading } = useTickets({ limit: 50 });
  const { client, loading: clientLoading } = useClientPortal(user?.clientId);

  const activeVisits  = tickets.filter((t) => ACTIVE_STATUSES.has(t.status));
  const historyRows   = tickets.filter((t) => DONE_STATUSES.has(t.status)).slice(0, 8);

  // Flatten all equipment across branches
  const allEquipment = (client?.branches ?? []).flatMap((b) =>
    (b.equipment ?? []).map((eq) => ({ ...eq, branchName: b.name }))
  );

  // Equipment status: has an active ticket referencing it
  const activeEquipmentIds = new Set(activeVisits.map((t) => t.equipmentId).filter(Boolean));

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome hero ───────────────────────────────────────────────── */}
      <section className="flex flex-col md:flex-row justify-between items-end gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-surface">
            Panel de Servicio
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Gestiona tu mantenimiento y sigue el estado de tus activos en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activeVisits.length > 0 && (
            <div className="glass-card px-4 py-2 rounded-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary" />
              </span>
              <span className="font-label-caps text-on-surface">
                {activeVisits.length} VISITA{activeVisits.length !== 1 ? "S" : ""} ACTIVA{activeVisits.length !== 1 ? "S" : ""}
              </span>
            </div>
          )}
          <Link
            href="/client/tickets/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-lg inner-glow hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Solicitar servicio
          </Link>
        </div>
      </section>

      {/* ── Bento grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Active Visits — 8/12 */}
        <div className="lg:col-span-8 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-primary flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Visitas activas
            </h2>
            <Link href="/client/history" className="text-xs text-primary hover:underline">
              Ver historial
            </Link>
          </div>

          <div className="p-5 space-y-3 flex-1">
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : !activeVisits.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCircle2 className="h-8 w-8 text-tertiary opacity-50" />
                <p className="text-sm text-muted-foreground">Sin visitas activas en este momento</p>
              </div>
            ) : (
              activeVisits.map((t, i) => {
                const avatar = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <Link
                    key={t.id}
                    href={`/client/tickets/${t.id}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-surface-container-high/50 border border-white/5 hover:bg-surface-container-high transition-colors"
                  >
                    {/* Tech avatar */}
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                      t.technician ? avatar.bg : "bg-surface-container-highest",
                      t.technician ? avatar.text : "text-on-surface-variant"
                    )}>
                      {t.technician ? techInitials(t.technician.name) : <Wrench className="h-4 w-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                        <StatusBadge ticket={t} />
                      </div>
                      <p className="text-xs text-on-surface-variant truncate">
                        {t.technician?.name ?? "Sin técnico asignado"}
                        {t.branch && ` · ${t.branch.name}`}
                        {t.equipment && ` · ${t.equipment.name}`}
                        {t.scheduledAt && ` · ${formatDate(t.scheduledAt)}`}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 text-on-surface-variant shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Asset Manager — 4/12 */}
        <div className="lg:col-span-4 glass-card rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-white/5 bg-white/5">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Mis equipos
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
            {clientLoading ? (
              <div className="p-5">
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : !allEquipment.length ? (
              <div className="p-5 flex flex-col items-center gap-2 py-10">
                <Wrench className="h-8 w-8 text-on-surface-variant opacity-30" />
                <p className="text-sm text-muted-foreground">Sin equipos registrados</p>
              </div>
            ) : (
              allEquipment.slice(0, 8).map((eq) => {
                const hasActiveTicket = activeEquipmentIds.has(eq.id);
                return (
                  <div key={eq.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 mr-3">
                      <p className="text-sm font-semibold text-on-surface truncate">{eq.name}</p>
                      <p className="text-xs text-on-surface-variant">{eq.branchName}</p>
                    </div>
                    {hasActiveTicket ? (
                      <AlertTriangle className="h-4 w-4 text-amber-accent shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-tertiary shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-white/5">
            <Link
              href="/client/branches"
              className="block w-full text-center py-2 bg-surface-container-high text-primary text-sm font-medium rounded-lg hover:bg-surface-bright transition-colors"
            >
              Ver todas las sucursales
            </Link>
          </div>
        </div>

        {/* Service History — 12/12 */}
        <div className="lg:col-span-12 glass-card rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de servicio reciente
            </h2>
            <Link
              href="/client/history"
              className="text-xs text-primary hover:underline"
            >
              Ver historial completo
            </Link>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-5">
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : !historyRows.length ? (
              <div className="p-10 flex flex-col items-center gap-2">
                <History className="h-8 w-8 text-on-surface-variant opacity-30" />
                <p className="text-sm text-muted-foreground">Sin historial de servicio</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    {["Fecha & Ticket", "Técnico", "Servicio realizado", "Estado", "Acciones"].map((h) => (
                      <th key={h} className="px-6 py-4 font-label-caps text-on-surface-variant">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {historyRows.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-on-surface">
                          {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(t.closedAt ?? t.createdAt))}
                        </p>
                        <p className="text-xs text-on-surface-variant font-label-caps mt-0.5">
                          #{t.id.slice(-6).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface">
                        {t.technician?.name ?? <span className="text-on-surface-variant italic">N/A</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface max-w-[260px]">
                        <p className="truncate">{t.title}</p>
                        {t.branch && (
                          <p className="text-xs text-on-surface-variant truncate">{t.branch.name}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full font-bold uppercase tracking-wider",
                          statusColor[t.status]
                        )}>
                          {statusLabel[t.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/client/tickets/${t.id}`}
                            className="p-2 rounded-full hover:bg-primary/20 text-primary transition-colors"
                            title="Ver ticket"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                          {t.report && (
                            <Link
                              href={`/client/tickets/${t.id}`}
                              className="p-2 rounded-full hover:bg-primary/20 text-primary transition-colors"
                              title="Ver reporte"
                            >
                              <XCircle className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
