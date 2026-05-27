"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Ticket, TicketReport, ReportTemplate, ReportTemplateField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, Play } from "lucide-react";

type TemplateWithFields = ReportTemplate & { fields: ReportTemplateField[] };

export default function TechTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [report, setReport] = useState<TicketReport | null>(null);
  const [template, setTemplate] = useState<TemplateWithFields | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const ticketRes = await api.get<Ticket>(`/api/tickets/${id}`);
        setTicket(ticketRes.data!);

        try {
          const reportRes = await api.get<TicketReport>(`/api/tickets/${id}/report`);
          setReport(reportRes.data!);
          if (reportRes.data?.template) setTemplate(reportRes.data.template as TemplateWithFields);
        } catch {
          // no report yet — fetch template for the form
          if (ticketRes.data!.status === "IN_PROGRESS") {
            const tmplRes = await api.get<TemplateWithFields>(`/api/report-templates/for-ticket/${id}`);
            setTemplate(tmplRes.data!);
          }
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function startWork() {
    setStarting(true);
    try {
      const res = await api.patch<Ticket>(`/api/tickets/${id}/start`, {});
      setTicket(res.data!);
      // Fetch the template now that ticket is IN_PROGRESS
      const tmplRes = await api.get<TemplateWithFields>(`/api/report-templates/for-ticket/${id}`);
      setTemplate(tmplRes.data!);
      toast({ title: "Trabajo iniciado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  }

  async function submitReport() {
    if (!template) return;
    // Validate required fields
    for (const field of template.fields) {
      if (field.required && !responses[field.id]?.trim()) {
        toast({ variant: "destructive", title: `El campo "${field.label}" es requerido` });
        return;
      }
    }
    setSaving(true);
    try {
      const res = await api.post<TicketReport>(`/api/tickets/${id}/report`, { responses });
      setReport(res.data!);
      if (res.data?.template) setTemplate(res.data.template as TemplateWithFields);
      setTicket((prev) => prev ? { ...prev, status: "COMPLETED" } : prev);
      toast({ title: "Reporte enviado exitosamente" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: ReportTemplateField, value: string, onChange: (v: string) => void) {
    const baseClass = "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    if (field.type === "TEXTAREA") {
      return (
        <textarea
          rows={3}
          className={cn(baseClass, "resize-none")}
          placeholder={`${field.label}...`}
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
    if (field.type === "PHOTO") {
      return (
        <div className="grid gap-2">
          <input
            type="file"
            accept="image/*"
            className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium cursor-pointer"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const canvas = document.createElement("canvas");
              const img = new Image();
              const url = URL.createObjectURL(file);
              img.onload = () => {
                const MAX = 1200;
                const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
                canvas.width = Math.round(img.width * ratio);
                canvas.height = Math.round(img.height * ratio);
                canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                onChange(canvas.toDataURL("image/jpeg", 0.8));
                URL.revokeObjectURL(url);
              };
              img.src = url;
            }}
          />
          {value && (
            <img src={value} alt="preview" className="max-h-48 rounded-md border border-border object-contain" />
          )}
        </div>
      );
    }
    if (field.type === "MULTISELECT") {
      const selected: string[] = value ? JSON.parse(value) : [];
      return (
        <div className="grid gap-2">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((s) => s !== opt);
                  onChange(JSON.stringify(next));
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    return <Input placeholder={`${field.label}...`} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  return (
    <div className="page-stack max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Ticket</h1>
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
            {ticket.startedAt && <div><span className="text-muted-foreground">Iniciado:</span> <span className="font-medium">{formatDate(ticket.startedAt)}</span></div>}
          </div>

          {ticket.status === "ASSIGNED" && (
            <Button onClick={startWork} disabled={starting} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {starting ? "Iniciando..." : "Iniciar trabajo"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dynamic report form — only when IN_PROGRESS */}
      {ticket.status === "IN_PROGRESS" && !report && template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completar reporte</CardTitle>
            <p className="text-xs text-muted-foreground">{template.name}</p>
          </CardHeader>
          <CardContent className="grid gap-4">
            {template.fields.map((field) => (
              <div key={field.id} className="grid gap-2">
                <Label>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field, responses[field.id] ?? "", (v) =>
                  setResponses((prev) => ({ ...prev, [field.id]: v }))
                )}
              </div>
            ))}
            <Button onClick={submitReport} disabled={saving} className="mt-2">
              {saving ? "Enviando..." : "Enviar reporte y completar ticket"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Read-only submitted report */}
      {report && template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reporte enviado</CardTitle>
            <p className="text-xs text-muted-foreground">{template.name}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {template.fields.map((field) => {
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
