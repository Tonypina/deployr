"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Ticket, ChevronRight, Search, X, User } from "lucide-react";
import { Ticket as TicketType, TicketStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { getTickets } from "@/lib/services/tickets";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 5;

const ALL_STATUSES: TicketStatus[] = [
  "REQUESTED", "PENDING_CLIENT_APPROVAL", "PENDING_ASSIGN", "ASSIGNED", "IN_PROGRESS", "REOPENED",
  "COMPLETED", "CLOSED", "CANCELLED", "EXPIRED", "REVIEW", "PENDING_APPROVAL",
];

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function TicketsPage() {
  // One-time fetch used only to populate filter dropdowns
  const [optionTickets, setOptionTickets] = useState<TicketType[]>([]);

  // Paginated results
  const [tickets, setTickets]   = useState<TicketType[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);

  // Filters
  const [search, setSearch]               = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]   = useState<Set<TicketStatus>>(new Set());
  const [clientId, setClientId]           = useState("");
  const [technicianId, setTechnicianId]   = useState("");
  const [branchId, setBranchId]           = useState("");
  const [equipmentId, setEquipmentId]     = useState("");

  // Stable string key for status set (for useEffect dependency)
  const statusKey = useMemo(() => [...statusFilter].sort().join(","), [statusFilter]);

  // Debounce search → also resets page
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // One-time options fetch
  useEffect(() => {
    getTickets({ limit: 100 }).then((d) => setOptionTickets(d.tickets)).catch(() => {});
  }, []);

  // Paginated + filtered results
  useEffect(() => {
    setLoading(true);
    getTickets({
      limit: PAGE_SIZE,
      page,
      search: debouncedSearch || undefined,
      status: statusKey || undefined,
      clientId:     clientId     || undefined,
      technicianId: technicianId || undefined,
      branchId:     branchId     || undefined,
      equipmentId:  equipmentId  || undefined,
    })
      .then((d) => { setTickets(d.tickets); setTotal(d.total); })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar tickets" }))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, statusKey, clientId, technicianId, branchId, equipmentId]);

  // ── Derived dropdown options ───────────────────────────────────────────────

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets.forEach((t) => { if (t.client) map.set(t.client.id, t.client.name); });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [optionTickets]);

  const technicians = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets.forEach((t) => { (t.technicians ?? []).forEach((tech) => map.set(tech.id, tech.name)); });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [optionTickets]);

  const availableBranches = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets
      .filter((t) => !clientId || t.clientId === clientId)
      .forEach((t) => {
        if (t.branch) {
          map.set(t.branch.id, t.branch.city ? `${t.branch.name} · ${t.branch.city}` : t.branch.name);
        }
      });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [optionTickets, clientId]);

  const availableEquipment = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets
      .filter((t) => (!clientId || t.clientId === clientId) && (!branchId || t.branchId === branchId))
      .forEach((t) => { if (t.equipment) map.set(t.equipment.id, t.equipment.name); });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [optionTickets, clientId, branchId]);

  // ── Filter handlers (always reset to page 1) ──────────────────────────────

  function toggleStatus(s: TicketStatus) {
    setPage(1);
    setStatusFilter((prev) => { const next = new Set(prev); next.has(s) ? next.delete(s) : next.add(s); return next; });
  }

  function handleClientChange(id: string) {
    setPage(1); setClientId(id); setBranchId(""); setEquipmentId("");
  }

  function handleBranchChange(id: string) {
    setPage(1); setBranchId(id); setEquipmentId("");
  }

  function clearFilters() {
    setPage(1);
    setSearch(""); setDebouncedSearch("");
    setStatusFilter(new Set());
    setClientId(""); setTechnicianId(""); setBranchId(""); setEquipmentId("");
  }

  const activeFilterCount =
    (statusFilter.size > 0 ? 1 : 0) +
    (clientId ? 1 : 0) + (technicianId ? 1 : 0) +
    (branchId ? 1 : 0) + (equipmentId ? 1 : 0);

  return (
    <div className="page-stack">

      {/* Header */}
      <div className="page-header">
        <div>
                    <p className="text-muted-foreground text-sm mt-0.5">
            {loading ? "Cargando..." : `${total} ticket${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1" />
              Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/tickets/new"><Plus className="h-4 w-4 mr-1" />Nuevo ticket</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 space-y-4">

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre del ticket..."
              className="pl-9 pr-9"
            />
            {search && (
              <button onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status chips */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Estado</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STATUSES.map((s) => {
                const on = statusFilter.has(s);
                return (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full font-medium transition-all border",
                      on
                        ? cn(statusColor[s], "border-transparent")
                        : "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {statusLabel[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Cliente</p>
              <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} className={selectClass}>
                <option value="">Todos</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Técnico</p>
              <select value={technicianId} onChange={(e) => { setPage(1); setTechnicianId(e.target.value); }} className={selectClass}>
                <option value="">Todos</option>
                {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Sucursal</p>
              <select
                value={branchId}
                onChange={(e) => handleBranchChange(e.target.value)}
                disabled={availableBranches.length === 0}
                className={cn(selectClass, availableBranches.length === 0 && "opacity-40 cursor-not-allowed")}
              >
                <option value="">Todas</option>
                {availableBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Equipo</p>
              <select
                value={equipmentId}
                onChange={(e) => { setPage(1); setEquipmentId(e.target.value); }}
                disabled={availableEquipment.length === 0}
                className={cn(selectClass, availableEquipment.length === 0 && "opacity-40 cursor-not-allowed")}
              >
                <option value="">Todos</option>
                {availableEquipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="glass-card rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card rounded-xl px-6 py-14 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center">
            <Ticket className="h-6 w-6 text-on-surface-variant" />
          </div>
          <p className="font-semibold text-on-surface">
            {total === 0 && activeFilterCount === 0 ? "Sin tickets" : "Ningún ticket coincide con los filtros"}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-sm text-primary hover:underline">Limpiar filtros</button>
          )}
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    {["Folio", "Ticket", "Cliente", "Técnico", "Sucursal / Equipo", "Fecha", ""].map((h) => (
                      <th key={h} className="px-6 py-4 font-label-caps text-on-surface-variant border-b border-outline-variant/30">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono font-semibold text-muted-foreground">
                          {t.folio != null ? `#${t.folio}` : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[220px]">
                        <p className="font-semibold text-sm text-on-surface truncate">{t.title}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">{t.client?.name ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 shrink-0" />
                          {(t.technicians ?? []).length > 0
                            ? (t.technicians!.length === 1
                                ? t.technicians![0].name
                                : `${t.technicians![0].name} y ${t.technicians!.length - 1} más`)
                            : <span className="italic">Sin asignar</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant">
                        {t.branch?.name ?? "—"}
                        {t.equipment && <span className="block text-xs">{t.equipment.name}</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                        {formatDate(t.closedAt ?? t.scheduledAt ?? t.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/admin/tickets/${t.id}`}><ChevronRight className="h-3.5 w-3.5 text-on-surface-variant" /></Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} total={total} limit={PAGE_SIZE} onPage={setPage} />
        </>
      )}
    </div>
  );
}
