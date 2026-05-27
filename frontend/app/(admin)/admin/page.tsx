"use client";

import { useEffect, useState } from "react";
import { Ticket, Users, Building2, Package, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import type { Ticket as TicketType, Client, InventoryItem } from "@/lib/types";

interface DashboardData {
  tickets: { tickets: TicketType[]; total: number };
  clients: Client[];
  inventory: InventoryItem[];
}

export default function AdminDashboard() {
  const [data, setData] = useState<Partial<DashboardData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [ticketsRes, clientsRes, inventoryRes] = await Promise.all([
          api.get<{ tickets: TicketType[]; total: number }>("/api/tickets?limit=5"),
          api.get<Client[]>("/api/clients?limit=5"),
          api.get<InventoryItem[]>("/api/inventory"),
        ]);
        setData({
          tickets: ticketsRes.data,
          clients: clientsRes.data,
          inventory: inventoryRes.data,
        });
      } catch {
        // silent — individual cards show empty state
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openTickets = data.tickets?.tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length ?? 0;
  const lowStockItems = data.inventory?.filter((i) => i.minStock != null && i.quantity <= i.minStock) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Resumen de operaciones</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard title="Tickets activos" value={loading ? "—" : openTickets} icon={Ticket} color="text-blue-600" />
        <StatsCard title="Clientes" value={loading ? "—" : (data.clients?.length ?? 0)} icon={Building2} color="text-green-600" />
        <StatsCard title="Items en inventario" value={loading ? "—" : (data.inventory?.length ?? 0)} icon={Package} color="text-purple-600" />
        <StatsCard title="Bajo stock" value={loading ? "—" : lowStockItems.length} icon={AlertTriangle} color="text-red-500" description="Requieren reposición" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Últimos tickets</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : !data.tickets?.tickets.length ? (
              <p className="text-sm text-muted-foreground">Sin tickets</p>
            ) : (
              <div className="space-y-3">
                {data.tickets.tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.client?.name} · {formatDate(t.createdAt)}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inventario bajo stock</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : !lowStockItems.length ? (
              <p className="text-sm text-muted-foreground">Todos los items tienen stock suficiente</p>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.sku ?? "Sin SKU"}</p>
                    </div>
                    <Badge variant="destructive">{i.quantity} {i.unit ?? "uds"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
