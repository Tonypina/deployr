"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Cpu, MapPin, User, FileText, ThumbsUp } from "lucide-react";
import { useTicket } from "@/lib/hooks/use-ticket";
import { approveTicket } from "@/lib/services/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function ClientTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ticket, report, loading, setTicket } = useTicket(id);
  const [approving, setApproving] = useState(false);

  async function handleApprove() {
    setApproving(true);
    try {
      const updated = await approveTicket(id);
      setTicket(updated);
      toast({ title: "Servicio aprobado", description: "El ticket continuará el proceso de instalación" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="page-stack">
        <p className="text-sm text-muted-foreground">Ticket no encontrado</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href="/client"><ArrowLeft className="h-3.5 w-3.5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight truncate">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>
                {statusLabel[ticket.status]}
              </span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[ticket.priority])}>
                {priorityLabel[ticket.priority]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Approval panel */}
      {ticket.status === "PENDING_APPROVAL" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-900">Revisión de servicio pendiente de aprobación</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Se requiere su aprobación para proceder con la instalación de repuestos.{" "}
                  {ticket.reviewDocument && (
                    <a href={ticket.reviewDocument} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Ver documento de revisión
                    </a>
                  )}
                </p>
              </div>
              <Button onClick={handleApprove} disabled={approving} className="bg-amber-600 hover:bg-amber-700 shrink-0">
                <ThumbsUp className="h-4 w-4 mr-1" />
                {approving ? "Aprobando..." : "Aprobar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Detalles del servicio</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          {ticket.scheduledAt && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Fecha programada:</span>
              <span className="font-medium">{formatDate(ticket.scheduledAt)}</span>
            </div>
          )}
          {ticket.branch && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Sucursal:</span>
              <span className="font-medium">{ticket.branch.name}</span>
            </div>
          )}
          {ticket.equipment && (
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Equipo:</span>
              <span className="font-medium">{ticket.equipment.name}</span>
            </div>
          )}
          {ticket.technician && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Técnico asignado:</span>
              <span className="font-medium">{ticket.technician.name}</span>
            </div>
          )}
          {ticket.policy && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Póliza:</span>
              <span className="font-medium">{ticket.policy.name}</span>
            </div>
          )}
          {ticket.description && (
            <div className="text-sm mt-1">
              <p className="text-muted-foreground mb-1">Descripción</p>
              <p>{ticket.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card>
          <CardHeader><CardTitle className="text-base">Reporte de servicio</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {Object.entries(report.responses).map(([key, value]) => (
              <div key={key} className="text-sm">
                <p className="text-muted-foreground text-xs mb-0.5">{key}</p>
                <p className="font-medium">{String(value)}</p>
              </div>
            ))}
            {report.spareParts?.length ? (
              <div className="border-t pt-2 mt-1">
                <p className="text-sm font-medium mb-1">Repuestos requeridos</p>
                <div className="grid gap-1">
                  {report.spareParts.map((sp) => (
                    <div key={sp.id} className="flex justify-between text-sm">
                      <span>{sp.inventoryItem.name}</span>
                      <span className="text-muted-foreground">{sp.quantity} {sp.inventoryItem.unit ?? "uds"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground mt-1">{formatDate(report.createdAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
