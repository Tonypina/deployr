"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays, MapPin, Play, ChevronRight,
  CheckCircle2, ClipboardList, Package, Zap,
  TrendingUp, AlertTriangle,
} from "lucide-react";
import { cn, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { useTickets } from "@/lib/hooks/use-tickets";
import { useInventory } from "@/lib/hooks/use-inventory";
import { useAuthStore } from "@/lib/auth-store";
import { checkinTicket, startTicket } from "@/lib/services/tickets";
import { toast } from "@/hooks/use-toast";
import { Ticket } from "@/lib/types";

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: "border-l-4 border-l-destructive",
  HIGH:   "border-l-4 border-l-amber-accent",
  MEDIUM: "border-l-4 border-l-primary",
  LOW:    "",
};

const PRIORITY_ICON_COLOR: Record<string, string> = {
  URGENT: "text-destructive",
  HIGH:   "text-amber-accent",
  MEDIUM: "text-primary",
  LOW:    "text-on-surface-variant",
};

function ticketSortKey(t: Ticket) {
  if (t.status === "IN_PROGRESS" || t.status === "PENDING_REPORT") return 0;
  if (t.status === "ON_SITE")     return 1;
  if (t.status === "ASSIGNED")    return 2;
  return 3;
}

export default function TechPortal() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { tickets, loading, refetch } = useTickets({ limit: 5 });
  const { items: inventory } = useInventory();

  const active    = tickets.filter((t) => ["IN_PROGRESS", "PENDING_REPORT", "ON_SITE"].includes(t.status));
  const assigned  = tickets.filter((t) => t.status === "ASSIGNED");
  const completed = tickets.filter((t) => ["COMPLETED", "CLOSED"].includes(t.status));
  const remaining = active.length + assigned.length;
  const total     = tickets.length;
  const progressPct = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  const sorted = [...tickets].sort((a, b) => ticketSortKey(a) - ticketSortKey(b));
  const nextVisit = assigned[0] ?? active[0] ?? null;

  const today = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  async function handleCheckin(id: string) {
    try {
      await checkinTicket(id);
      toast({ title: "Check-in registrado" });
      refetch();
      router.push(`/tech/tickets/${id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  async function handleStart(id: string) {
    try {
      await startTicket(id);
      toast({ title: "Ticket iniciado" });
      refetch();
      router.push(`/tech/tickets/${id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── Welcome & Stats Bento ───────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Welcome card — 2/4 */}
        <div className="md:col-span-2 glass-card p-6 rounded-xl flex flex-col justify-between min-h-[160px]">
          <div>
            <span className="font-label-caps text-primary">Sesión activa</span>
            <h2 className="text-2xl font-bold text-on-surface mt-1">
              Hola, {user?.name.split(" ")[0] ?? "Técnico"}
            </h2>
            <p className="text-on-surface-variant text-sm mt-1 capitalize">
              {today} &nbsp;·&nbsp; {remaining} tarea{remaining !== 1 ? "s" : ""} pendiente{remaining !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3 mt-6">
            <Link
              href="/tech/history"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-tertiary-container/20 text-tertiary text-sm font-semibold rounded-lg border border-tertiary/20 hover:bg-tertiary/20 active:scale-95 transition-all"
            >
              <ClipboardList className="h-4 w-4" />
              Mis tickets
            </Link>
          </div>
        </div>

        {/* Remaining tasks — 1/4 */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="font-label-caps text-on-surface-variant">Tareas pendientes</span>
          <span className="font-stat-value text-amber-accent mt-2">
            {loading ? "—" : String(remaining).padStart(2, "0")}
          </span>
          <div className="w-full bg-outline-variant h-1 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-amber-accent h-full rounded-full transition-all duration-700"
              style={{ width: `${100 - progressPct}%` }}
            />
          </div>
        </div>

        {/* Completed — 1/4 */}
        <div className="glass-card p-6 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="font-label-caps text-on-surface-variant">Completados</span>
          <span className="font-stat-value text-tertiary mt-2">
            {loading ? "—" : String(completed.length).padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1 mt-2 text-tertiary">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">{progressPct}% del total</span>
          </div>
        </div>
      </section>

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Today's schedule — 2/3 */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Mi agenda
            </h3>
            <span className="font-label-caps text-on-surface-variant capitalize">{today}</span>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground px-1">Cargando...</p>
          ) : !tickets.length ? (
            <div className="glass-card rounded-xl p-12 flex flex-col items-center gap-3">
              <ClipboardList className="h-10 w-10 text-on-surface-variant opacity-30" />
              <p className="text-sm text-muted-foreground">Sin tickets asignados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sorted.map((t) => {
                const isActive    = ["IN_PROGRESS", "ON_SITE", "PENDING_REPORT"].includes(t.status);
                const isCompleted = ["COMPLETED", "CLOSED", "CANCELLED"].includes(t.status);
                const borderClass = isCompleted ? "" : PRIORITY_BORDER[t.priority] ?? "";
                const iconColor   = isCompleted ? "text-tertiary" : (PRIORITY_ICON_COLOR[t.priority] ?? "text-on-surface-variant");

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "glass-card p-4 rounded-xl relative overflow-hidden",
                      borderClass,
                      isCompleted && "opacity-60"
                    )}
                  >
                    <div className="flex gap-4 items-start">
                      {/* Icon box */}
                      <div className="bg-surface-container-highest p-3 rounded-lg shrink-0">
                        {isCompleted
                          ? <CheckCircle2 className="h-5 w-5 text-tertiary" />
                          : <AlertTriangle className={cn("h-5 w-5", iconColor)} />
                        }
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className={cn("text-sm font-semibold text-on-surface truncate", isCompleted && "line-through")}>
                              {t.title}
                            </h4>
                            {(t.branch || t.client) && (
                              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">
                                  {t.client?.name}{t.branch && ` · ${t.branch.name}`}
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", priorityColor[t.priority])}>
                              {priorityLabel[t.priority]}
                            </span>
                            {t.scheduledAt && (
                              <span className="text-[10px] text-on-surface-variant">
                                {formatDate(t.scheduledAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons for non-completed */}
                        {!isCompleted && (
                          <div className="flex flex-wrap gap-2 pt-3">
                            {t.status === "ASSIGNED" ? (
                              <button
                                onClick={() => handleCheckin(t.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                              >
                                <MapPin className="h-4 w-4" />
                                Registrar llegada
                              </button>
                            ) : t.status === "ON_SITE" ? (
                              <button
                                onClick={() => handleStart(t.id)}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                              >
                                <Play className="h-4 w-4 fill-current" />
                                Iniciar trabajo
                              </button>
                            ) : (
                              <Link
                                href={`/tech/tickets/${t.id}`}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:bg-primary/90 active:scale-95 transition-all"
                              >
                                <Play className="h-4 w-4 fill-current" />
                                Continuar
                              </Link>
                            )}
                            <Link
                              href={`/tech/tickets/${t.id}`}
                              className="flex items-center gap-2 px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface text-sm font-bold rounded-lg hover:bg-surface-bright active:scale-95 transition-all"
                            >
                              Ver detalles
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        )}

                        {isCompleted && (
                          <div className="pt-2">
                            <span className="font-label-caps text-tertiary">{statusLabel[t.status]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Sidebar — 1/3 */}
        <aside className="space-y-6">

          {/* Next visit */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-outline-variant flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                Próxima visita
              </h3>
              {nextVisit && (
                <Link href={`/tech/tickets/${nextVisit.id}`} className="text-xs text-primary hover:underline">
                  Ver ticket
                </Link>
              )}
            </div>
            <div className="p-4">
              {!nextVisit ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <CheckCircle2 className="h-8 w-8 text-tertiary opacity-50" />
                  <p className="text-sm text-muted-foreground text-center">Sin visitas pendientes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-surface-container-high/50 rounded-lg p-3 border border-white/5">
                    <p className="text-sm font-semibold text-on-surface">{nextVisit.title}</p>
                    {nextVisit.client && (
                      <p className="text-xs text-on-surface-variant mt-1">{nextVisit.client.name}</p>
                    )}
                    {nextVisit.branch && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {nextVisit.branch.name}
                        {nextVisit.branch.city && ` · ${nextVisit.branch.city}`}
                      </p>
                    )}
                    {nextVisit.scheduledAt && (
                      <p className="font-label-caps text-primary mt-2">
                        {formatDate(nextVisit.scheduledAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("relative flex h-2 w-2")}>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    <span className="font-label-caps text-on-surface-variant">
                      {statusLabel[nextVisit.status]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inventory quick view */}
          <div className="glass-card p-4 rounded-xl space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2 px-1">
              <Package className="h-4 w-4 text-primary" />
              Inventario rápido
            </h3>
            <div className="space-y-2">
              {inventory.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="bg-surface-container-low border border-outline-variant rounded-lg p-3 flex justify-between items-center hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Zap className="h-4 w-4 text-on-surface-variant shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{item.name}</p>
                      {item.sku && (
                        <p className="font-label-caps text-on-surface-variant">SKU: {item.sku}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-label-caps text-on-surface-variant shrink-0 ml-2">
                    {item.quantity} {item.unit ?? "uds"}
                  </span>
                </div>
              ))}
              {!inventory.length && (
                <p className="text-xs text-muted-foreground text-center py-2">Sin inventario disponible</p>
              )}
            </div>
          </div>

          {/* Live activity */}
          <div className="glass-card p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary" />
              </span>
              <h3 className="text-sm font-semibold">Actividad reciente</h3>
            </div>
            <div className="space-y-4">
              {active.length > 0 ? (
                active.slice(0, 2).map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="w-0.5 bg-outline-variant rounded self-stretch" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {t.client?.name}{t.branch && ` · ${t.branch.name}`}
                      </p>
                      <p className="font-label-caps text-primary">En progreso</p>
                    </div>
                  </div>
                ))
              ) : completed.length > 0 ? (
                completed.slice(0, 2).map((t) => (
                  <div key={t.id} className="flex gap-3">
                    <div className="w-0.5 bg-outline-variant rounded self-stretch" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                      <p className="text-xs text-on-surface-variant">
                        {t.client?.name}{t.branch && ` · ${t.branch.name}`}
                      </p>
                      <p className="font-label-caps text-tertiary">Completado</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Sin actividad reciente</p>
              )}
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
