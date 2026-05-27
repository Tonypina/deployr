"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, UserCheck, X, CheckCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { Ticket, TicketReport, Technician } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const assignSchema = z.object({
  technicianId: z.string().min(1, "Selecciona un técnico"),
  scheduledAt: z.string().optional(),
});

type AssignForm = z.infer<typeof assignSchema>;

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [report, setReport] = useState<TicketReport | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
  });

  useEffect(() => {
    async function load() {
      try {
        const [ticketRes, techRes] = await Promise.all([
          api.get<Ticket>(`/api/tickets/${id}`),
          api.get<{ users: Technician[] }>("/api/users?role=TECHNICIAN&limit=100"),
        ]);
        setTicket(ticketRes.data!);
        setTechnicians((techRes.data?.users ?? []).filter((t) => t.isActive));
        try {
          const rRes = await api.get<TicketReport>(`/api/tickets/${id}/report`);
          setReport(rRes.data!);
        } catch {
          // no report yet
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function onAssign(values: AssignForm) {
    setActing(true);
    try {
      const res = await api.patch<Ticket>(`/api/tickets/${id}/assign`, {
        technicianId: values.technicianId,
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
      });
      setTicket(res.data!);
      toast({ title: "Técnico asignado exitosamente" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function closeTicket() {
    setActing(true);
    try {
      const res = await api.patch<Ticket>(`/api/tickets/${id}/close`, {});
      setTicket(res.data!);
      toast({ title: "Ticket cerrado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function cancelTicket() {
    if (!confirm("¿Cancelar este ticket? Esta acción no se puede deshacer.")) return;
    setActing(true);
    try {
      const res = await api.patch<Ticket>(`/api/tickets/${id}/cancel`, {});
      setTicket(res.data!);
      toast({ title: "Ticket cancelado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  const isTerminal = ticket.status === "CLOSED" || ticket.status === "CANCELLED";

  return (
    <div className="page-stack max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1">Ticket</h1>
        {!isTerminal && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={cancelTicket} disabled={acting}>
            <X className="h-4 w-4 mr-1" />Cancelar
          </Button>
        )}
      </div>

      {/* Ticket info */}
      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>{statusLabel[ticket.status]}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[ticket.priority])}>{priorityLabel[ticket.priority]}</span>
          </div>
          <CardTitle className="text-xl mt-1">{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{ticket.client?.name}</span></div>
            {ticket.branch && <div><span className="text-muted-foreground">Sucursal:</span> <span className="font-medium">{ticket.branch.name}{ticket.branch.city ? `, ${ticket.branch.city}` : ""}</span></div>}
            {ticket.equipment && <div><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{ticket.equipment.name}</span></div>}
            {ticket.technician && <div><span className="text-muted-foreground">Técnico:</span> <span className="font-medium">{ticket.technician.name}</span></div>}
            {ticket.scheduledAt && <div><span className="text-muted-foreground">Programado:</span> <span className="font-medium">{formatDate(ticket.scheduledAt)}</span></div>}
            {ticket.startedAt && <div><span className="text-muted-foreground">Iniciado:</span> <span className="font-medium">{formatDate(ticket.startedAt)}</span></div>}
            {ticket.closedAt && <div><span className="text-muted-foreground">Cerrado:</span> <span className="font-medium">{formatDate(ticket.closedAt)}</span></div>}
            <div><span className="text-muted-foreground">Creado:</span> <span className="font-medium">{formatDate(ticket.createdAt)}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Assign technician — only when PENDING */}
      {ticket.status === "PENDING" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4" />Asignar técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onAssign)} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Técnico *</Label>
                <select
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    errors.technicianId && "border-destructive"
                  )}
                  {...register("technicianId")}
                >
                  <option value="">Seleccionar técnico...</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {errors.technicianId && <p className="text-xs text-destructive">{errors.technicianId.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Fecha programada</Label>
                <Input type="datetime-local" {...register("scheduledAt")} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={acting}>
                  <UserCheck className="h-4 w-4 mr-1" />
                  {acting ? "Asignando..." : "Asignar y programar"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Close ticket — only when COMPLETED */}
      {ticket.status === "COMPLETED" && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-green-900">Ticket completado</p>
                <p className="text-sm text-green-700 mt-0.5">El técnico envió el reporte. Revísalo y cierra el ticket.</p>
              </div>
              <Button onClick={closeTicket} disabled={acting} className="bg-green-700 hover:bg-green-800 shrink-0">
                <CheckCheck className="h-4 w-4 mr-1" />
                {acting ? "Cerrando..." : "Cerrar ticket"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report */}
      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reporte del técnico</CardTitle>
            {report.template && <p className="text-xs text-muted-foreground">{report.template.name}</p>}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {report.template?.fields.map((field) => {
              const value = report.responses[field.id];
              if (!value) return null;
              return (
                <div key={field.id}>
                  <p className="font-medium text-muted-foreground mb-1">{field.label}</p>
                  {field.type === "PHOTO" ? (
                    <img src={value} alt={field.label} className="max-h-48 rounded-md border border-border object-contain" />
                  ) : field.type === "MULTISELECT" ? (
                    <ul className="list-disc list-inside space-y-0.5">
                      {(JSON.parse(value) as string[]).map((v) => <li key={v}>{v}</li>)}
                    </ul>
                  ) : field.type === "DATE" ? (
                    <p>{formatDate(value)}</p>
                  ) : (
                    <p>{value}</p>
                  )}
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground pt-1">Enviado {formatDate(report.createdAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
