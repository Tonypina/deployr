"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus, Building2, Search, GitBranch, Cpu, Zap,
  Pencil, Trash2, ChevronLeft, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { StatsCard } from "@/components/shared/stats-card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { useClients } from "@/lib/hooks/use-clients";
import { useClientStats } from "@/lib/hooks/use-client-stats";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { deleteClient } from "@/lib/services/clients";
import { getTickets } from "@/lib/services/tickets";
import { toast } from "@/hooks/use-toast";
import { Client, Ticket } from "@/lib/types";
import { PlanLimitBadge } from "@/components/shared/plan-limit-badge";
import { usePlanFeatures } from "@/lib/hooks/use-plan-features";

// ── Client detail panel ───────────────────────────────────────────────────────

function ClientDetail({ client, onBack }: { client: Client; onBack: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const TICKETS_LIMIT = 5;

  function loadTickets(p: number) {
    setTicketsLoading(true);
    getTickets({ clientId: client.id, limit: TICKETS_LIMIT, page: p, orderBy: "updatedAt" })
      .then((d) => { setTickets(d.tickets); setTicketsTotal(d.total); setTicketsPage(p); })
      .catch(() => {})
      .finally(() => setTicketsLoading(false));
  }

  useEffect(() => { loadTickets(1); }, [client.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const initials = client.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="page-stack">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors w-fit"
      >
        <ChevronLeft className="h-4 w-4" />
        Regresar a clientes
      </button>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Left: client info ── */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          {/* Avatar + name */}
          <div className="px-6 py-6 border-b border-outline-variant/30 flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-on-surface truncate">{client.name}</h2>
              {client.giro && (
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-label-caps mt-1">
                  {client.giro}
                </span>
              )}
            </div>
          </div>

          {/* Info fields */}
          <div className="px-6 py-5 grid gap-4">
            <InfoRow label="Email" value={client.contactEmail} />
            {client.contactPhone && <InfoRow label="Teléfono" value={client.contactPhone} />}
            {client.address     && <InfoRow label="Dirección" value={client.address} />}
            {client.taxId       && <InfoRow label="RFC / Tax ID" value={client.taxId} />}
            <InfoRow label="Registrado" value={formatDate(client.createdAt)} />
          </div>

          {/* Counts */}
          <div className="px-6 pb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Sucursales", value: client._count?.branches ?? 0 },
              { label: "Equipos",    value: client.equipmentCount ?? 0 },
              { label: "Tickets",    value: client._count?.tickets ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-container-low rounded-lg px-3 py-3 text-center">
                <p className="text-xl font-bold text-on-surface">{value}</p>
                <p className="text-[10px] font-label-caps text-on-surface-variant mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/admin/clients/${client.id}`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Right: tickets ── */}
        <div className="lg:col-span-3 glass-card rounded-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-outline-variant/30 flex items-center justify-between">
            <h3 className="font-semibold text-on-surface">Tickets del cliente</h3>
            {ticketsTotal > 0 && (
              <span className="text-xs text-on-surface-variant font-label-caps">{ticketsTotal} total</span>
            )}
          </div>

          <div className="px-6 py-4">
            {ticketsLoading ? (
              <p className="text-sm text-on-surface-variant py-6 text-center">Cargando...</p>
            ) : !tickets.length ? (
              <p className="text-sm text-on-surface-variant py-6 text-center">Sin tickets registrados</p>
            ) : (
              <div className="list-rows">
                {tickets.map((t) => (
                  <Link
                    key={t.id}
                    href={`/admin/tickets/${t.id}`}
                    className="flex items-start justify-between gap-3 hover:bg-white/5 -mx-2 px-2 py-2 rounded-md transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-on-surface">{t.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-1">
                        {t.branch?.name && <><span>{t.branch.name}</span><span className="meta-sep" /></>}
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0 items-end">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>
                        {statusLabel[t.status]}
                      </span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>
                        {priorityLabel[t.priority]}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {ticketsTotal > TICKETS_LIMIT && (
            <div className="px-6 pb-5">
              <Pagination
                page={ticketsPage}
                total={ticketsTotal}
                limit={TICKETS_LIMIT}
                onPage={loadTickets}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-label-caps text-on-surface-variant mb-0.5">{label}</p>
      <p className="text-sm text-on-surface break-all">{value}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [search, setSearch]                   = useState("");
  const [selectedClient, setSelectedClient]   = useState<Client | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  const debouncedSearch = useDebounce(search, 300);
  const { clients, total, page, limit, loading, refetch, goToPage } =
    useClients({ search: debouncedSearch || undefined });
  const { data: stats } = useClientStats();
  const { features } = usePlanFeatures();
  const atClientLimit = features?.clientMax !== null && features?.clientMax !== undefined && total >= features.clientMax;

  // If the selected client's data refreshes, keep it in sync
  useEffect(() => {
    if (!selectedClient) return;
    const fresh = clients.find((c) => c.id === selectedClient.id);
    if (fresh) setSelectedClient(fresh);
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      await deleteClient(id);
      toast({ title: "Cliente eliminado" });
      setDeletingId(null);
      if (selectedClient?.id === id) setSelectedClient(null);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setDeleting(false);
    }
  }

  // Show detail view when a client is selected
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <div>
                    <div className="flex items-center gap-2 mt-0.5">
            <p className="text-on-surface-variant text-sm">Directorio y seguimiento de clientes</p>
            <PlanLimitBadge used={total} max={features?.clientMax} />
          </div>
        </div>
        {atClientLimit ? (
          <Button disabled>
            <Plus className="h-4 w-4 mr-1.5" />Nuevo cliente
          </Button>
        ) : (
          <Button asChild>
            <Link href="/admin/clients/new">
              <Plus className="h-4 w-4 mr-1.5" />Nuevo cliente
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatsCard title="Total clientes"    value={stats.total}    icon={Building2} color="text-primary" />
        <StatsCard title="Clientes activos"  value={stats.active}   icon={Zap}       color="text-tertiary"
          progress={stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}
          progressColor="bg-tertiary" />
        <StatsCard title="Total sucursales"  value={stats.branches}  icon={GitBranch} color="text-secondary" />
        <StatsCard title="Total equipos"     value={stats.equipment} icon={Cpu}       color="text-primary" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
        <Input
          placeholder="Buscar por nombre..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      ) : !clients.length ? (
        <div className="glass-card rounded-xl px-6 py-14 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center">
            <Building2 className="h-6 w-6 text-on-surface-variant" />
          </div>
          <p className="font-semibold text-on-surface">
            {search ? "Sin resultados" : "Sin clientes"}
          </p>
          <p className="text-sm text-on-surface-variant">
            {search ? "Intenta con otro término" : "Agrega tu primer cliente"}
          </p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    {["Cliente", "Sector", "Sucursales", "Equipos", "Acciones"].map((h) => (
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
                  {clients.map((c) => {
                    const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                    const isConfirmingDelete = deletingId === c.id;

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger row click when clicking action buttons
                          if ((e.target as HTMLElement).closest("[data-action]")) return;
                          setSelectedClient(c);
                        }}
                      >
                        {/* Client */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-on-surface truncate">{c.name}</p>
                              <p className="text-xs text-on-surface-variant truncate">{c.contactEmail}</p>
                            </div>
                          </div>
                        </td>

                        {/* Sector */}
                        <td className="px-6 py-4 text-sm text-on-surface-variant">
                          {c.giro ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-caps">
                              {c.giro}
                            </span>
                          ) : (
                            <span className="text-outline">—</span>
                          )}
                        </td>

                        {/* Branches */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-on-surface">
                            <GitBranch className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
                            {c._count?.branches ?? 0}
                          </div>
                        </td>

                        {/* Equipment */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-on-surface">
                            <Cpu className="h-3.5 w-3.5 text-on-surface-variant shrink-0" />
                            {c.equipmentCount ?? 0}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4" data-action>
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5" data-action>
                              <span className="text-xs text-destructive font-medium">¿Eliminar?</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                disabled={deleting}
                                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                                data-action
                              >
                                {deleting ? "..." : "Sí"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                data-action
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1" data-action>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Editar cliente"
                                onClick={(e) => { e.stopPropagation(); }}
                                asChild
                                data-action
                              >
                                <Link href={`/admin/clients/${c.id}`} data-action>
                                  <Pencil className="h-3.5 w-3.5 text-on-surface-variant" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Eliminar cliente"
                                onClick={(e) => { e.stopPropagation(); setDeletingId(c.id); }}
                                data-action
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Ver detalle"
                                onClick={(e) => { e.stopPropagation(); setSelectedClient(c); }}
                                data-action
                              >
                                <ArrowRight className="h-3.5 w-3.5 text-on-surface-variant" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} total={total} limit={limit} onPage={goToPage} />
        </>
      )}
    </div>
  );
}
