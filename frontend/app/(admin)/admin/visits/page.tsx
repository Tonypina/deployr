"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ScheduledVisit, VisitStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { visitStatusLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Calendar } from "lucide-react";

const STATUS_OPTS: VisitStatus[] = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];

export default function AdminVisitsPage() {
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VisitStatus | "">("");
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const qs = filter ? `?status=${filter}` : "";
    api.get<ScheduledVisit[]>(`/api/visits${qs}`)
      .then((r) => setVisits(r.data ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, [filter]);

  async function updateStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
    setUpdating(id);
    try {
      await api.put(`/api/visits/${id}`, { status });
      setVisits((prev) => prev.map((v) => v.id === id ? { ...v, status } : v));
      toast({ title: `Visita ${status === "CONFIRMED" ? "confirmada" : "cancelada"}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visitas programadas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{visits.length} solicitudes</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === "" ? "default" : "outline"} size="sm" onClick={() => setFilter("")}>Todas</Button>
        {STATUS_OPTS.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {visitStatusLabel[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !visits.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Calendar className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin visitas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visits.map((v) => (
            <Card key={v.id}>
              <CardContent className="card-content-tight flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{v.client?.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(v.requestedAt)}</p>
                  {v.branch && <p className="text-sm text-muted-foreground">{v.branch.name}{v.branch.city ? ` - ${v.branch.city}` : ""}</p>}
                  {v.notes && <p className="text-sm text-muted-foreground mt-1">{v.notes}</p>}
                  <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-muted font-medium">
                    {visitStatusLabel[v.status]}
                  </span>
                </div>
                {v.status === "PENDING" && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      disabled={updating === v.id}
                      onClick={() => updateStatus(v.id, "CONFIRMED")}
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={updating === v.id}
                      onClick={() => updateStatus(v.id, "CANCELLED")}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
