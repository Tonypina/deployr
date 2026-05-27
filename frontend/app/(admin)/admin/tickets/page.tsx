"use client";

import { useEffect, useState } from "react";
import { Plus, Ticket } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Ticket as TicketType, TicketStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const STATUSES: TicketStatus[] = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED", "EXPIRED"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");

  useEffect(() => {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    api.get<{ tickets: TicketType[]; total: number }>(`/api/tickets${qs}`)
      .then((r) => { setTickets(r.data?.tickets ?? []); setTotal(r.data?.total ?? 0); })
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} tickets en total</p>
        </div>
        <Button asChild>
          <Link href="/admin/tickets/new"><Plus className="h-4 w-4 mr-1" />Nuevo ticket</Link>
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={statusFilter === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setStatusFilter("")}
        >
          Todos
        </Button>
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {statusLabel[s]}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !tickets.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Ticket className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin tickets</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="card-content-tight">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])}>{statusLabel[t.status]}</span>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[t.priority])}>{priorityLabel[t.priority]}</span>
                    </div>
                    <p className="font-semibold truncate">{t.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {t.client?.name}
                      {t.branch && ` · ${t.branch.name}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.technician ? `Técnico: ${t.technician.name}` : "Sin técnico asignado"}
                      {" · "}
                      {formatDate(t.scheduledAt ?? t.createdAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/tickets/${t.id}`}>Ver</Link>
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
