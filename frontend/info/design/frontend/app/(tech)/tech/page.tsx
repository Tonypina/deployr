"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { api } from "@/lib/api-client";
import { Ticket, TicketStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STATUSES: (TicketStatus | "")[] = ["", "OPEN", "IN_PROGRESS", "COMPLETED"];

export default function TechDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TicketStatus | "">("");

  useEffect(() => {
    const qs = filter ? `?status=${filter}` : "";
    api.get<{ tickets: Ticket[] }>(`/api/tickets${qs}`)
      .then((r) => setTickets(r.data?.tickets ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mis Tickets</h1>
        <p className="text-muted-foreground text-sm">{tickets.length} asignados</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)}>
            {s === "" ? "Todos" : statusLabel[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !tickets.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <ClipboardList className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin tickets asignados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex gap-2 mb-1 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                    </div>
                    <p className="font-semibold truncate">{t.title}</p>
                    <p className="text-sm text-muted-foreground">{t.client?.name}{t.branch && ` · ${t.branch.name}`}</p>
                    {t.scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-1">Programado: {formatDate(t.scheduledAt)}</p>
                    )}
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/tech/tickets/${t.id}`}>Ver</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
