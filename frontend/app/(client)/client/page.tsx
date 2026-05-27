"use client";

import { useEffect, useState } from "react";
import { Ticket, Calendar, ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Ticket as TicketType, ScheduledVisit } from "@/lib/types";
import { StatsCard } from "@/components/shared/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, visitStatusLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function ClientDashboard() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ tickets: TicketType[] }>("/api/tickets?limit=10"),
      api.get<ScheduledVisit[]>("/api/visits"),
    ])
      .then(([tRes, vRes]) => {
        setTickets(tRes.data?.tickets ?? []);
        setVisits(vRes.data ?? []);
      })
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  const active = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const completed = tickets.filter((t) => t.status === "COMPLETED");
  const pending = visits.filter((v) => v.status === "PENDING" || v.status === "CONFIRMED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Panel</h1>
        <p className="text-muted-foreground text-sm">Resumen de tus servicios</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Tickets activos" value={loading ? "—" : active.length} icon={Ticket} color="text-blue-600" />
        <StatsCard title="Visitas programadas" value={loading ? "—" : pending.length} icon={Calendar} color="text-orange-500" />
        <StatsCard title="Servicios completados" value={loading ? "—" : completed.length} icon={ClipboardCheck} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Tickets recientes</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> :
              !tickets.length ? <p className="text-sm text-muted-foreground">Sin tickets</p> :
              <div className="space-y-3">
                {tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", statusColor[t.status])}>{statusLabel[t.status]}</span>
                  </div>
                ))}
              </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Próximas visitas</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Cargando...</p> :
              !pending.length ? <p className="text-sm text-muted-foreground">Sin visitas programadas</p> :
              <div className="space-y-3">
                {pending.slice(0, 5).map((v) => (
                  <div key={v.id} className="flex items-start justify-between gap-2 border-b pb-3 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatDate(v.requestedAt)}</p>
                      {v.branch && <p className="text-xs text-muted-foreground">{v.branch.name}</p>}
                      {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 shrink-0">
                      {visitStatusLabel[v.status]}
                    </span>
                  </div>
                ))}
              </div>
            }
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
