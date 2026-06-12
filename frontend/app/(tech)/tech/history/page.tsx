"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search, X, ClipboardList, ChevronRight,
  CheckCircle2, Play, Clock, XCircle, RotateCcw, AlertCircle,
} from "lucide-react";
import { getTickets } from "@/lib/services/tickets";
import { Ticket, TicketStatus } from "@/lib/types";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 5;

const HISTORY_STATUSES: TicketStatus[] = [
  "ASSIGNED", "IN_PROGRESS", "REOPENED",
  "COMPLETED", "CLOSED", "CANCELLED", "EXPIRED",
];

function StatusIcon({ status }: { status: TicketStatus }) {
  if (status === "COMPLETED" || status === "CLOSED")
    return <CheckCircle2 className="h-4 w-4 text-tertiary" />;
  if (status === "IN_PROGRESS")
    return <Play className="h-4 w-4 text-primary fill-primary" />;
  if (status === "REOPENED")
    return <RotateCcw className="h-4 w-4 text-rose-400" />;
  if (status === "CANCELLED" || status === "EXPIRED")
    return <XCircle className="h-4 w-4 text-on-surface-variant opacity-50" />;
  if (status === "ASSIGNED")
    return <AlertCircle className="h-4 w-4 text-blue-400" />;
  return <Clock className="h-4 w-4 text-on-surface-variant" />;
}

const selectClass =
  "w-full bg-surface-container-high border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors";

export default function TechHistoryPage() {
  const [optionTickets, setOptionTickets] = useState<Ticket[]>([]);

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch]                   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]       = useState<Set<TicketStatus>>(new Set());
  const [clientId, setClientId]               = useState("");
  const [branchId, setBranchId]               = useState("");
  const [equipmentId, setEquipmentId]         = useState("");

  const statusKey = useMemo(() => [...statusFilter].sort().join(","), [statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    getTickets({ limit: 100 }).then((d) => setOptionTickets(d.tickets)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getTickets({
      limit: PAGE_SIZE,
      page,
      search:      debouncedSearch || undefined,
      status:      statusKey       || undefined,
      clientId:    clientId        || undefined,
      branchId:    branchId        || undefined,
      equipmentId: equipmentId     || undefined,
    })
      .then((d) => { setTickets(d.tickets); setTotal(d.total); })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar historial" }))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, statusKey, clientId, branchId, equipmentId]);

  // ── Derived dropdown options ───────────────────────────────────────────────

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets.forEach((t) => { if (t.client) map.set(t.client.id, t.client.name); });
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [optionTickets]);

  const availableBranches = useMemo(() => {
    const map = new Map<string, string>();
    optionTickets
      .filter((t) => !clientId || t.clientId === clientId)
      .forEach((t) => {
        if (t.branch) map.set(t.branch.id, t.branch.city ? `${t.branch.name} · ${t.branch.city}` : t.branch.name);
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

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setClientId(""); setBranchId(""); setEquipmentId("");
  }

  const activeFilterCount =
    (statusFilter.size > 0 ? 1 : 0) + (clientId ? 1 : 0) + (branchId ? 1 : 0) + (equipmentId ? 1 : 0);

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Historial de tickets</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {loading ? "Cargando..." : `${total} ticket${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-destructive hover:border-destructive/40 transition-colors shrink-0 mt-1"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="glass-card rounded-xl p-5 space-y-5">

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre del ticket..."
            className="w-full bg-surface-container-high border border-outline-variant rounded-lg pl-9 pr-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          />
          {search && (
            <button onClick={() => { setSearch(""); setDebouncedSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div>
          <p className="font-label-caps text-on-surface-variant mb-2.5">Estado</p>
          <div className="flex flex-wrap gap-2">
            {HISTORY_STATUSES.map((s) => {
              const on = statusFilter.has(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium transition-all border",
                    on
                      ? cn(statusColor[s], "border-transparent ring-1 ring-white/20")
                      : "bg-surface-container-high border-outline-variant text-on-surface-variant hover:border-primary/40 hover:text-on-surface"
                  )}
                >
                  {statusLabel[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cascading dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <p className="font-label-caps text-on-surface-variant mb-1.5">Cliente</p>
            <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} className={selectClass}>
              <option value="">Todos los clientes</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <p className="font-label-caps text-on-surface-variant mb-1.5">Sucursal</p>
            <select
              value={branchId}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={availableBranches.length === 0}
              className={cn(selectClass, availableBranches.length === 0 && "opacity-40 cursor-not-allowed")}
            >
              <option value="">Todas las sucursales</option>
              {availableBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <p className="font-label-caps text-on-surface-variant mb-1.5">Equipo</p>
            <select
              value={equipmentId}
              onChange={(e) => { setPage(1); setEquipmentId(e.target.value); }}
              disabled={availableEquipment.length === 0}
              className={cn(selectClass, availableEquipment.length === 0 && "opacity-40 cursor-not-allowed")}
            >
              <option value="">Todos los equipos</option>
              {availableEquipment.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="glass-card rounded-xl p-12 flex items-center justify-center">
          <p className="text-sm text-on-surface-variant">Cargando tickets...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center gap-3">
          <ClipboardList className="h-10 w-10 text-on-surface-variant opacity-25" />
          <p className="text-sm text-on-surface-variant font-medium">
            {total === 0 && activeFilterCount === 0 ? "Sin historial de tickets" : "Ningún ticket coincide con los filtros"}
          </p>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar filtros</button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/tech/tickets/${t.id}`}
                className="flex items-start gap-4 glass-card rounded-xl p-4 border border-transparent hover:border-primary/25 transition-all group"
              >
                <div className="bg-surface-container-highest p-2.5 rounded-lg shrink-0 mt-0.5">
                  <StatusIcon status={t.status} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                  </div>
                  <p className="text-sm font-semibold text-on-surface truncate">{t.title}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {t.client && <span className="text-xs text-on-surface-variant">{t.client.name}</span>}
                    {t.branch && <span className="text-xs text-on-surface-variant">{t.branch.name}{t.branch.city ? ` · ${t.branch.city}` : ""}</span>}
                    {t.equipment && <span className="text-xs text-on-surface-variant">{t.equipment.name}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="font-label-caps text-on-surface-variant text-right">
                    {formatDate(t.closedAt ?? t.scheduledAt ?? t.createdAt)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination — wrapped to match the glass style */}
          {Math.ceil(total / PAGE_SIZE) > 1 && (
            <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-on-surface-variant tabular-nums">{page} / {Math.ceil(total / PAGE_SIZE)}</span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm text-on-surface-variant hover:border-primary/40 hover:text-on-surface disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
