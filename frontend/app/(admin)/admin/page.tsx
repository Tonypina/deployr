"use client";

import { Ticket, Building2, AlertTriangle, FileCheck, Users } from "lucide-react";
import Link from "next/link";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { useTickets } from "@/lib/hooks/use-tickets";
import { useClients } from "@/lib/hooks/use-clients";
import { useInventory } from "@/lib/hooks/use-inventory";
import { useUpcomingPolicyTickets } from "@/lib/hooks/use-policies";
import { useTechnicians } from "@/lib/hooks/use-technicians";
import { Ticket as TicketType } from "@/lib/types";
import { TicketsByClientChart } from "@/components/shared/tickets-by-client-chart";

const BUSY_STATUSES = new Set(["ASSIGNED", "ON_SITE", "IN_PROGRESS", "PENDING_REPORT"]);

export default function AdminDashboard() {
  const { tickets: allTickets, loading: ticketsLoading } = useTickets({ limit: 5, orderBy: "updatedAt" });
  const { tickets: activeTickets } = useTickets({ limit: 100 });
  const { clients, total: clientsTotal, loading: clientsLoading } = useClients();
  const { items: inventory, total: inventoryTotal, loading: inventoryLoading } = useInventory();
  const { tickets: upcomingPolicyTickets, loading: policyTicketsLoading } = useUpcomingPolicyTickets();
  const { technicians, loading: techsLoading } = useTechnicians({ limit: 100 });
  const loading = ticketsLoading || clientsLoading || inventoryLoading;

  const openTickets = allTickets.filter((t) => ["PENDING", "ASSIGNED", "ON_SITE", "IN_PROGRESS", "PENDING_REPORT"].includes(t.status)).length;
  const lowStockItems = inventory.filter((i) => i.minStock != null && i.quantity <= i.minStock);
  void clients;

  // Build technicianId → active ticket map (first ASSIGNED/IN_PROGRESS wins)
  const techTicketMap = new Map<string, TicketType>();
  for (const t of activeTickets) {
    if (t.technicianId && BUSY_STATUSES.has(t.status) && !techTicketMap.has(t.technicianId)) {
      techTicketMap.set(t.technicianId, t);
    }
  }

  // Active clients — unique clients with at least one open ticket
  const activeClientIds = new Set(activeTickets.filter((t) => BUSY_STATUSES.has(t.status)).map((t) => t.clientId));
  const activeClientsCount = activeClientIds.size;
  const clientsCapacityPct = clientsTotal > 0 ? Math.round((activeClientsCount / clientsTotal) * 100) : 0;

  // Tech utilization — % of technicians currently on an active ticket
  const busyTechsCount = techTicketMap.size;
  const totalTechs = technicians.length;
  const techUtilizationPct = totalTechs > 0 ? Math.round((busyTechsCount / totalTechs) * 100) : 0;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Resumen de operaciones</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Tickets activos"
          value={loading ? "—" : openTickets}
          icon={Ticket}
          color="text-primary"
          description={loading ? undefined : `${openTickets} tickets en curso`}
        />
        <StatsCard
          title="Clientes activos"
          value={loading ? "—" : activeClientsCount}
          icon={Building2}
          color="text-secondary"
          progress={loading ? undefined : clientsCapacityPct}
          progressColor="bg-secondary"
          description={loading ? undefined : `${clientsCapacityPct}% de clientes con tickets abiertos`}
        />
        <StatsCard
          title="Utilización de técnicos"
          value={techsLoading ? "—" : `${techUtilizationPct}%`}
          icon={Users}
          color="text-tertiary"
          description={techsLoading ? undefined : `${busyTechsCount}/${totalTechs} técnicos en sitio`}
        />
        <StatsCard
          title="Bajo stock"
          value={loading ? "—" : lowStockItems.length}
          icon={AlertTriangle}
          color="text-destructive"
          description="Requieren reposición"
        />
      </div>

      {!policyTicketsLoading && upcomingPolicyTickets.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                <CardTitle>Próximos tickets de póliza</CardTitle>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/policies" className="text-xs">Ver pólizas</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="list-rows">
              {upcomingPolicyTickets.map((t) => (
                <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-start justify-between gap-2 hover:bg-muted/50 -mx-1 px-1 rounded-md transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.client?.name}
                      {t.scheduledAt && <><span className="meta-sep" />{formatDate(t.scheduledAt)}</>}
                    </p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", statusColor[t.status])}>
                    {statusLabel[t.status]}
                  </span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart (2/3) + Last tickets (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <CardTitle>Tickets por cliente — {new Date().getFullYear()}</CardTitle>
              </div>
              <span className="font-label-caps text-on-surface-variant">Top 3 clientes</span>
            </div>
          </CardHeader>
          <CardContent>
            <TicketsByClientChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Últimos tickets</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : !allTickets.length ? (
              <p className="text-sm text-muted-foreground">Sin tickets</p>
            ) : (
              <div className="list-rows">
                {allTickets.slice(0, 5).map((t) => (
                  <Link key={t.id} href={`/admin/tickets/${t.id}`} className="flex items-start justify-between gap-2 hover:bg-muted/50 -mx-1 px-1 rounded-md transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.client?.name}
                        <span className="meta-sep" />
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technician Status Tracker */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-on-surface">Estado de Técnicos</h2>
            <p className="text-on-surface-variant text-xs mt-0.5">Monitoreo de disponibilidad en tiempo real</p>
          </div>
          <Link
            href="/admin/technicians"
            className="flex items-center gap-1.5 text-primary text-sm hover:underline"
          >
            Ver técnicos
            <Users className="h-4 w-4" />
          </Link>
        </div>

        {/* Table */}
        {techsLoading ? (
          <div className="px-6 py-8">
            <p className="text-sm text-muted-foreground">Cargando...</p>
          </div>
        ) : !technicians.length ? (
          <div className="px-6 py-8">
            <p className="text-sm text-muted-foreground">Sin técnicos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  {["Técnico", "Tarea actual", "Estado", "Progreso", "Ticket"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-4 font-label-caps text-on-surface-variant border-b border-outline-variant/30"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {technicians.map((tech, i) => {
                  const activeTicket = techTicketMap.get(tech.id);
                  const isAvailable = !activeTicket;
                  const ticketStatus = activeTicket?.status;

                  // Cycle avatar colors for visual variety
                  const avatarStyles = [
                    { bg: "bg-primary/20",      text: "text-primary"      },
                    { bg: "bg-amber-accent/20", text: "text-amber-accent" },
                    { bg: "bg-tertiary/20",     text: "text-tertiary"     },
                  ];
                  const avatar = avatarStyles[i % avatarStyles.length];
                  const initials = tech.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

                  // Load bar — increases with each step in the workflow
                  const loadPct = ticketStatus === "PENDING_REPORT" ? 100
                    : ticketStatus === "IN_PROGRESS" ? 75
                    : ticketStatus === "ON_SITE" ? 50
                    : ticketStatus === "ASSIGNED" ? 25
                    : 0;
                  const loadColor = ticketStatus === "PENDING_REPORT" ? "bg-violet-400"
                    : ticketStatus === "IN_PROGRESS" ? "bg-tertiary"
                    : ticketStatus === "ON_SITE" ? "bg-cyan-400"
                    : ticketStatus === "ASSIGNED" ? "bg-primary"
                    : "bg-outline-variant";

                  // ETA: use scheduledAt if present
                  const eta = activeTicket?.scheduledAt
                    ? new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit" }).format(new Date(activeTicket.scheduledAt))
                    : "N/A";

                  return (
                    <tr key={tech.id} className="hover:bg-white/5 transition-colors">
                      {/* Technician */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0", avatar.bg, avatar.text)}>
                            {initials}
                          </div>
                          <p className="font-semibold text-sm text-on-surface">{tech.name}</p>
                        </div>
                      </td>

                      {/* Current task */}
                      <td className="px-6 py-4 text-sm max-w-[220px]">
                        {isAvailable ? (
                          <span className="text-on-surface-variant italic">Sin tarea activa</span>
                        ) : (
                          <span className="text-on-surface truncate block">{activeTicket.title}</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4">
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-surface-container-highest font-label-caps text-on-surface-variant">
                            DISPONIBLE
                          </span>
                        ) : ticketStatus === "ASSIGNED" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 font-label-caps text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-flex" />
                            ASIGNADO
                          </span>
                        ) : ticketStatus === "ON_SITE" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/10 font-label-caps text-cyan-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-flex" />
                            EN SITIO
                          </span>
                        ) : ticketStatus === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-tertiary/10 font-label-caps text-tertiary">
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping inline-flex" />
                            EN PROGRESO
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-violet-500/10 font-label-caps text-violet-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-flex" />
                            LLENANDO REPORTE
                          </span>
                        )}
                      </td>

                      {/* Load bar */}
                      <td className="px-6 py-4">
                        <div className="w-24 bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500", loadColor)}
                            style={{ width: `${loadPct}%` }}
                          />
                        </div>
                      </td>

                      {/* Ticket link */}
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {activeTicket ? (
                          <Link
                            href={`/admin/tickets/${activeTicket.id}`}
                            className="text-primary hover:underline text-xs font-label-caps"
                          >
                            VER TICKET →
                          </Link>
                        ) : (
                          <span>{eta}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Inventario bajo stock</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : !lowStockItems.length ? (
            <p className="text-sm text-muted-foreground">Todos los items tienen stock suficiente</p>
          ) : (
            <div className="list-rows">
              {lowStockItems.slice(0, 5).map((i) => (
                <div key={i.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.sku ?? "Sin SKU"}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-500/15 text-red-300">
                    {i.quantity} {i.unit ?? "uds"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
