"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Ticket, TicketReport, TicketStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

const reportSchema = z.object({
  findings: z.string().min(10, "Mínimo 10 caracteres"),
  actions: z.string().min(10, "Mínimo 10 caracteres"),
  partsUsed: z.string().optional(),
  nextVisitDate: z.string().optional(),
});

type ReportForm = z.infer<typeof reportSchema>;

const STATUS_TRANSITIONS: Partial<Record<TicketStatus, TicketStatus>> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
};

export default function TechTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [report, setReport] = useState<TicketReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
  });

  useEffect(() => {
    async function load() {
      try {
        const ticketRes = await api.get<Ticket>(`/api/tickets/${id}`);
        setTicket(ticketRes.data!);
        try {
          const reportRes = await api.get<TicketReport>(`/api/tickets/${id}/report`);
          setReport(reportRes.data!);
        } catch {
          // No report yet
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function advanceStatus() {
    if (!ticket) return;
    const next = STATUS_TRANSITIONS[ticket.status];
    if (!next) return;
    setUpdating(true);
    try {
      const res = await api.put<Ticket>(`/api/tickets/${id}`, { status: next });
      setTicket(res.data!);
      toast({ title: `Ticket actualizado a "${statusLabel[next]}"` });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setUpdating(false);
    }
  }

  async function onSubmitReport(values: ReportForm) {
    setSaving(true);
    try {
      const res = await api.post<TicketReport>(`/api/tickets/${id}/report`, {
        ...values,
        nextVisitDate: values.nextVisitDate ? new Date(values.nextVisitDate).toISOString() : undefined,
      });
      setReport(res.data!);
      setTicket((prev) => prev ? { ...prev, status: "COMPLETED" } : prev);
      toast({ title: "Reporte enviado exitosamente" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  const nextStatus = STATUS_TRANSITIONS[ticket.status];

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Ticket</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>{statusLabel[ticket.status]}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[ticket.priority])}>{priorityLabel[ticket.priority]}</span>
          </div>
          <CardTitle className="text-xl mt-2">{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{ticket.client?.name}</span></div>
            {ticket.branch && <div><span className="text-muted-foreground">Sucursal:</span> <span className="font-medium">{ticket.branch.name}</span></div>}
            {ticket.equipment && <div><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{ticket.equipment.name}</span></div>}
            {ticket.scheduledAt && <div><span className="text-muted-foreground">Programado:</span> <span className="font-medium">{formatDate(ticket.scheduledAt)}</span></div>}
          </div>
          {nextStatus && (
            <Button onClick={advanceStatus} disabled={updating} className="w-full">
              {updating ? "Actualizando..." : `Marcar como "${statusLabel[nextStatus]}"`}
            </Button>
          )}
        </CardContent>
      </Card>

      {ticket.status !== "OPEN" && (
        <Card>
          <CardHeader><CardTitle className="text-base">{report ? "Reporte enviado" : "Completar reporte"}</CardTitle></CardHeader>
          <CardContent>
            {report ? (
              <div className="space-y-3 text-sm">
                <div><p className="font-medium text-muted-foreground">Hallazgos</p><p>{report.findings}</p></div>
                <div><p className="font-medium text-muted-foreground">Acciones realizadas</p><p>{report.actions}</p></div>
                {report.partsUsed && <div><p className="font-medium text-muted-foreground">Partes utilizadas</p><p>{report.partsUsed}</p></div>}
                {report.nextVisitDate && <div><p className="font-medium text-muted-foreground">Próxima visita</p><p>{formatDate(report.nextVisitDate)}</p></div>}
                <Badge variant="secondary">Enviado {formatDate(report.createdAt)}</Badge>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmitReport)} className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Hallazgos *</Label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Describe lo que encontraste..."
                    {...register("findings")}
                  />
                  {errors.findings && <p className="text-xs text-destructive">{errors.findings.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Acciones realizadas *</Label>
                  <textarea
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Describe las acciones que realizaste..."
                    {...register("actions")}
                  />
                  {errors.actions && <p className="text-xs text-destructive">{errors.actions.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Partes/refacciones utilizadas</Label>
                  <Input placeholder="Filtro FA-001, correa..." {...register("partsUsed")} />
                </div>
                <div className="grid gap-2">
                  <Label>Próxima visita recomendada</Label>
                  <Input type="datetime-local" {...register("nextVisitDate")} />
                </div>
                <Button type="submit" disabled={saving}>{saving ? "Enviando..." : "Enviar reporte"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
