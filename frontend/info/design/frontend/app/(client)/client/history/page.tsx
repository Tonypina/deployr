"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Ticket } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ClipboardList } from "lucide-react";

export default function HistoryPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);

  useEffect(() => {
    api.get<{ tickets: Ticket[] }>("/api/tickets?status=COMPLETED&limit=50")
      .then((r) => setTickets(r.data?.tickets ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Historial de servicios</h1>
        <p className="text-muted-foreground text-sm">{tickets.length} servicios completados</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !tickets.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin historial</p>
            <p className="text-sm text-muted-foreground">Los servicios completados aparecerán aquí</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(selected?.id === t.id ? null : t)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                    </div>
                    <p className="font-semibold truncate">{t.title}</p>
                    {t.branch && <p className="text-sm text-muted-foreground">{t.branch.name}{t.branch.city ? ` - ${t.branch.city}` : ""}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Completado: {formatDate(t.closedAt ?? t.updatedAt)}
                      {t.technician && ` · ${t.technician.name}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    {selected?.id === t.id ? "Ocultar" : "Detalle"}
                  </Button>
                </div>

                {selected?.id === t.id && (
                  <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                    {t.description && <p className="text-muted-foreground">{t.description}</p>}
                    {t.equipment && <p><span className="font-medium">Equipo: </span>{t.equipment.name}</p>}
                    {t.report && (
                      <div className="space-y-1">
                        <p className="font-medium">Tiene reporte técnico</p>
                        <p className="text-xs text-muted-foreground">Reporte ID: {t.report.id}</p>
                      </div>
                    )}
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
