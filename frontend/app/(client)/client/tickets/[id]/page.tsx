"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ThumbsUp, Download, X } from "lucide-react";
import { useTicket } from "@/lib/hooks/use-ticket";
import { approveTicket, rejectTicket } from "@/lib/services/tickets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";

function parseImages(value: string): string[] {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [value];
  } catch {
    return [value];
  }
}

export default function ClientTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ticket, report, template, loading, setTicket } = useTicket(id);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  async function handleApprove() {
    setApproving(true);
    try {
      const updated = await approveTicket(id);
      setTicket(updated);
      toast({ title: "Aprobado", description: "El ticket continuará su proceso." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      const updated = await rejectTicket(id);
      setTicket(updated);
      toast({ title: "Cotización rechazada", description: "Se notificará para una cotización revisada." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setRejecting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  return (
    <>
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/client"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-2 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>
              {statusLabel[ticket.status]}
            </span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[ticket.priority])}>
              {priorityLabel[ticket.priority]}
            </span>
          </div>
          <CardTitle className="text-xl mt-1">{ticket.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {ticket.branch && <div><span className="text-muted-foreground">Sucursal:</span> <span className="font-medium">{ticket.branch.name}</span></div>}
            {ticket.equipment && <div><span className="text-muted-foreground">Equipo:</span> <span className="font-medium">{ticket.equipment.name}</span></div>}
            {ticket.technicians && ticket.technicians.length > 0 && (
              <div>
                <span className="text-muted-foreground">Técnico{ticket.technicians.length > 1 ? "s" : ""}:</span>{" "}
                <span className="font-medium">{ticket.technicians.map((t) => t.name).join(", ")}</span>
              </div>
            )}
            {ticket.scheduledAt && <div><span className="text-muted-foreground">Programado:</span> <span className="font-medium">{formatDate(ticket.scheduledAt)}</span></div>}
            {ticket.closedAt && <div><span className="text-muted-foreground">Cerrado:</span> <span className="font-medium">{formatDate(ticket.closedAt)}</span></div>}
            <div><span className="text-muted-foreground">Creado:</span> <span className="font-medium">{formatDate(ticket.createdAt)}</span></div>
          </div>
        </CardContent>
      </Card>

      {ticket.status === "PENDING_CLIENT_APPROVAL" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-900">Cotización pendiente de aprobación</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Revisa la cotización del servicio y apruébala para continuar.{" "}
                  {ticket.quotationDocument && (
                    <a href={ticket.quotationDocument} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Ver cotización
                    </a>
                  )}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button onClick={handleReject} disabled={approving || rejecting} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                  <X className="h-4 w-4 mr-1" />
                  {rejecting ? "Rechazando..." : "Rechazar"}
                </Button>
                <Button onClick={handleApprove} disabled={approving || rejecting} className="bg-amber-600 hover:bg-amber-700">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {approving ? "Aprobando..." : "Aprobar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {ticket.reportPdfUrl && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-900">Orden de trabajo generada</p>
                <p className="text-sm text-blue-700 mt-0.5">El documento de servicio está listo para descargar.</p>
              </div>
              <Button asChild className="bg-blue-700 hover:bg-blue-800 shrink-0">
                <a href={ticket.reportPdfUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-1" />Descargar PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reporte de servicio</CardTitle>
            {report.template && <p className="text-xs text-muted-foreground">{report.template.name}</p>}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {template?.fields.map((field) => {
              const value = report.responses[field.id];
              if (!value) return null;
              return (
                <div key={field.id}>
                  <p className="font-medium text-muted-foreground mb-1">{field.label}</p>
                  {field.type === "PHOTO" ? (
                    <div className="flex flex-wrap gap-2">
                      {parseImages(value).map((src, i) => (
                        <button key={i} type="button" onClick={() => setLightboxSrc(src)} className="shrink-0">
                          <img src={src} alt={`${field.label} ${i + 1}`} className="h-20 w-20 rounded-md border border-border object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
                        </button>
                      ))}
                    </div>
                  ) : field.type === "SIGNATURE" ? (
                    (() => {
                      const src = parseImages(value)[0];
                      return src ? (
                        <button type="button" onClick={() => setLightboxSrc(src)} className="inline-block">
                          <img src={src} alt="Firma" className="h-24 max-w-xs rounded-md border border-border object-contain bg-white hover:opacity-80 transition-opacity cursor-zoom-in" />
                        </button>
                      ) : null;
                    })()
                  ) : field.type === "MULTISELECT" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(JSON.parse(value) as string[]).map((v) => (
                        <span key={v} className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">{v}</span>
                      ))}
                    </div>
                  ) : field.type === "DATE" ? (
                    <p>{formatDate(value)}</p>
                  ) : (
                    <p>{value}</p>
                  )}
                </div>
              );
            })}
            {report.spareParts?.length ? (
              <div className="border-t pt-3 mt-1">
                <p className="font-medium text-sm mb-1">Repuestos requeridos</p>
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
            <p className="text-xs text-muted-foreground pt-1">Enviado {formatDate(report.createdAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>

    {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
