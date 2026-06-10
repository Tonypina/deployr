"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, UserCheck, X, CheckCheck, FileText, Upload, ThumbsUp, RotateCcw, Pencil, MapPin, ClipboardList, Download } from "lucide-react";
import { useTicket } from "@/lib/hooks/use-ticket";
import { useTechnicians } from "@/lib/hooks/use-technicians";
import { assignTicket, closeTicket as closeTicketService, cancelTicket as cancelTicketService, submitReview as submitReviewService, approveTicket as approveTicketService, reopenTicket as reopenTicketService } from "@/lib/services/tickets";
import { updateReport as updateReportService } from "@/lib/services/reports";
import { uploadPdf } from "@/lib/services/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ReportTemplateField } from "@/lib/types";

function parseImages(value: string): string[] {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [value];
  } catch {
    return [value];
  }
}

const assignSchema = z.object({
  technicianId: z.string().min(1, "Selecciona un técnico"),
  scheduledAt: z.string().optional(),
});

type AssignForm = z.infer<typeof assignSchema>;

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ticket, report, template, loading, setTicket, refetch } = useTicket(id);
  const { technicians: allTechnicians } = useTechnicians();
  const technicians = allTechnicians.filter((t) => t.isActive);
  const [acting, setActing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reportEdits, setReportEdits] = useState<Record<string, string>>({});
  const [updatingReport, setUpdatingReport] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
  });

  useEffect(() => {
    if (ticket?.status === "REOPENED" && report) {
      setReportEdits(report.responses);
    }
  }, [ticket?.status, report]);

  async function onAssign(values: AssignForm) {
    setActing(true);
    try {
      const updated = await assignTicket(id, {
        technicianId: values.technicianId,
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
      });
      setTicket(updated);
      toast({ title: "Técnico asignado exitosamente" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function handleCloseTicket() {
    setActing(true);
    try {
      const updated = await closeTicketService(id);
      setTicket(updated);
      toast({ title: "Ticket cerrado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function handleReopenTicket() {
    setActing(true);
    try {
      const updated = await reopenTicketService(id);
      setTicket(updated);
      toast({ title: "Ticket reabierto", description: "El técnico puede corregir el reporte" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function handleUpdateReport() {
    setUpdatingReport(true);
    try {
      await updateReportService(id, reportEdits);
      await refetch();
      toast({ title: "Reporte actualizado", description: "El ticket volvió a estado Completado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setUpdatingReport(false);
    }
  }

  async function handleCancelTicket() {
    if (!confirm("¿Cancelar este ticket? Esta acción no se puede deshacer.")) return;
    setActing(true);
    try {
      const updated = await cancelTicketService(id);
      setTicket(updated);
      toast({ title: "Ticket cancelado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  async function handleSubmitReview() {
    if (!pdfFile) return;
    setUploadingPdf(true);
    try {
      const url = await uploadPdf(pdfFile);
      const updated = await submitReviewService(id, url);
      setTicket(updated);
      setPdfFile(null);
      toast({ title: "Revisión enviada", description: "Se notificó al cliente para su aprobación" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setUploadingPdf(false);
    }
  }

  async function handleApprove() {
    setActing(true);
    try {
      const updated = await approveTicketService(id);
      setTicket(updated);
      toast({ title: "Ticket aprobado", description: "El ticket continúa el ciclo normal" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setActing(false);
    }
  }

  function renderEditableField(field: ReportTemplateField, value: string, onChange: (v: string) => void) {
    const baseClass = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    if (field.type === "PHOTO") {
      const images = parseImages(value);
      if (!images.length) return <p className="text-sm text-muted-foreground">Sin imágenes</p>;
      return (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button key={i} type="button" onClick={() => setLightboxSrc(src)} className="shrink-0">
              <img src={src} alt={`Imagen ${i + 1}`} className="h-20 w-20 rounded-md border border-border object-cover hover:opacity-80 transition-opacity cursor-zoom-in" />
            </button>
          ))}
        </div>
      );
    }
    if (field.type === "SIGNATURE") {
      const src = parseImages(value)[0];
      if (!src) return <p className="text-sm text-muted-foreground">Sin firma</p>;
      return (
        <button type="button" onClick={() => setLightboxSrc(src)} className="inline-block">
          <img src={src} alt="Firma" className="h-24 max-w-xs rounded-md border border-border object-contain bg-white hover:opacity-80 transition-opacity cursor-zoom-in" />
        </button>
      );
    }
    if (field.type === "TEXTAREA") {
      return (
        <textarea
          rows={3}
          className={cn(baseClass, "resize-none")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    }
    if (field.type === "DATE") {
      return <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />;
    }
    if (field.type === "NUMBER") {
      return <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />;
    }
    if (field.type === "MULTISELECT") {
      const selected: string[] = value ? JSON.parse(value) : [];
      const remaining = (field.options ?? []).filter((opt) => !selected.includes(opt));
      return (
        <div className="grid gap-2">
          {remaining.length > 0 && (
            <select
              className={cn(baseClass, "cursor-pointer")}
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                onChange(JSON.stringify([...selected, e.target.value]));
                e.currentTarget.value = "";
              }}
            >
              <option value="" disabled>Seleccionar opción…</option>
              {remaining.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((opt) => (
                <span key={opt} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                  {opt}
                  <button type="button" onClick={() => onChange(JSON.stringify(selected.filter((s) => s !== opt)))} className="hover:text-blue-900 transition-colors" aria-label={`Quitar ${opt}`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }
    return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  const isTerminal = ["CLOSED", "CANCELLED", "REVIEW", "PENDING_APPROVAL"].includes(ticket.status);

  return (
    <>
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1">Ticket</h1>
        {!isTerminal && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleCancelTicket} disabled={acting}>
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

      {/* ON_SITE — technician has checked in */}
      {ticket.status === "ON_SITE" && (
        <Card className="border-cyan-200 bg-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-cyan-700 shrink-0" />
              <div>
                <p className="font-semibold text-cyan-900">Técnico en sitio</p>
                <p className="text-sm text-cyan-700 mt-0.5">El técnico llegó a la sucursal y registró su llegada. Iniciará el trabajo en breve.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PENDING_REPORT — technician finished job, filling report */}
      {ticket.status === "PENDING_REPORT" && (
        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-violet-700 shrink-0" />
              <div>
                <p className="font-semibold text-violet-900">Reporte pendiente</p>
                <p className="text-sm text-violet-700 mt-0.5">El técnico finalizó el trabajo y está completando el reporte de servicio.</p>
              </div>
            </div>
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
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={handleReopenTicket} disabled={acting} className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  {acting ? "..." : "Reabrir"}
                </Button>
                <Button onClick={handleCloseTicket} disabled={acting} className="bg-green-700 hover:bg-green-800">
                  <CheckCheck className="h-4 w-4 mr-1" />
                  {acting ? "Cerrando..." : "Cerrar ticket"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* REOPENED — editable report form */}
      {ticket.status === "REOPENED" && template && (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-rose-900">
              <Pencil className="h-4 w-4" />Ticket reabierto — Editar reporte
            </CardTitle>
            <p className="text-sm text-rose-700 mt-0.5">
              Corrige el reporte y guarda los cambios para volver a marcarlo como completado.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {template.fields.map((field) => (
              <div key={field.id} className="grid gap-2">
                <Label className="text-rose-900">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderEditableField(
                  field,
                  reportEdits[field.id] ?? "",
                  (v) => setReportEdits((prev) => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
            <Button onClick={handleUpdateReport} disabled={updatingReport} className="bg-rose-600 hover:bg-rose-700 mt-2 w-fit">
              <CheckCheck className="h-4 w-4 mr-1" />
              {updatingReport ? "Guardando..." : "Guardar y completar"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* REVIEW — upload PDF document */}
      {ticket.status === "REVIEW" && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-purple-900">
              <FileText className="h-4 w-4" />Revisión de repuestos
            </CardTitle>
            <p className="text-sm text-purple-700 mt-0.5">
              Este ticket fue generado para la instalación de repuestos. Sube el documento de revisión y envíalo al cliente para su aprobación.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label className="text-sm">Documento de revisión (PDF)</Label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-purple-900 hover:file:bg-purple-200"
              />
              {pdfFile && <p className="text-xs text-muted-foreground">{pdfFile.name}</p>}
            </div>
            <Button
              onClick={handleSubmitReview}
              disabled={!pdfFile || uploadingPdf}
              className="bg-purple-700 hover:bg-purple-800 w-fit"
            >
              <Upload className="h-4 w-4 mr-1" />
              {uploadingPdf ? "Subiendo..." : "Enviar revisión al cliente"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PENDING_APPROVAL — waiting for client to approve */}
      {ticket.status === "PENDING_APPROVAL" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-900">Esperando aprobación del cliente</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Se envió el documento al cliente.{" "}
                  {ticket.reviewDocument && (
                    <a href={ticket.reviewDocument} target="_blank" rel="noopener noreferrer" className="underline">
                      Ver documento
                    </a>
                  )}
                </p>
              </div>
              <Button onClick={handleApprove} disabled={acting} className="bg-amber-600 hover:bg-amber-700 shrink-0">
                <ThumbsUp className="h-4 w-4 mr-1" />
                {acting ? "Aprobando..." : "Aprobar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report — read-only when not REOPENED */}
      {report && ticket.status !== "REOPENED" && (
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
            {report.requiresSpareParts !== undefined && (
              <div className="border-t pt-3 mt-1">
                <p className="font-medium text-sm mb-1">Repuestos requeridos</p>
                {report.spareParts?.length ? (
                  <div className="grid gap-1">
                    {report.spareParts.map((sp) => (
                      <div key={sp.id} className="flex justify-between text-sm">
                        <span>{sp.inventoryItem.name}</span>
                        <span className="text-muted-foreground">{sp.quantity} {sp.inventoryItem.unit ?? "uds"}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No se requieren repuestos</p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground pt-1">Enviado {formatDate(report.createdAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>

    {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
