"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ReportTemplateField, InventoryItem } from "@/lib/types";
import { useTicket } from "@/lib/hooks/use-ticket";
import { checkinTicket, startTicket, finishTicket } from "@/lib/services/tickets";
import { submitReport as submitReportService, updateReport as updateReportService, getTemplateForTicket } from "@/lib/services/reports";
import { resizeToBlob, uploadImage } from "@/lib/services/upload";
import { getInventory } from "@/lib/services/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, statusColor, statusLabel, priorityColor, priorityLabel, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { ChevronLeft, Play, MapPin, CheckSquare, X, ImagePlus, Plus, Trash2, PencilLine, Check, Download } from "lucide-react";

// ── PhotoField ────────────────────────────────────────────────────────────────

function parseImages(value: string): string[] {
  if (!value) return [];
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : [value];
  } catch {
    return [value]; // legacy single base64 string
  }
}

function PhotoField({
  value,
  onChange,
  onRegisterFile,
  onUnregisterFile,
}: {
  value: string;
  onChange: (v: string) => void;
  onRegisterFile: (objectUrl: string, file: File) => void;
  onUnregisterFile: (objectUrl: string) => void;
}) {
  const images = parseImages(value);

  function handleFiles(files: File[]) {
    if (!files.length) return;
    const newUrls = files.map((file) => {
      const objectUrl = URL.createObjectURL(file);
      onRegisterFile(objectUrl, file);
      return objectUrl;
    });
    onChange(JSON.stringify([...images, ...newUrls]));
  }

  return (
    <div className="grid gap-2">
      <label className="inline-flex w-fit cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            handleFiles(files);
          }}
        />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 transition-colors">
          <ImagePlus className="h-3.5 w-3.5" />Agregar imágenes
        </span>
      </label>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <div key={src} className="relative group">
              <img src={src} alt={`Imagen ${i + 1}`} className="h-20 w-20 rounded-md border border-border object-cover" />
              <button
                type="button"
                onClick={() => {
                  if (src.startsWith("blob:")) {
                    onUnregisterFile(src);
                    URL.revokeObjectURL(src);
                  }
                  onChange(JSON.stringify(images.filter((_, j) => j !== i)));
                }}
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Quitar imagen ${i + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SignatureField ─────────────────────────────────────────────────────────────

function SignatureField({
  value,
  onChange,
  onRegisterFile,
  onUnregisterFile,
}: {
  value: string;
  onChange: (v: string) => void;
  onRegisterFile: (objectUrl: string, file: File) => void;
  onUnregisterFile: (objectUrl: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentSig = parseImages(value)[0];

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function getPos(canvas: HTMLCanvasElement, e: MouseEvent | Touch) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function startDraw(e: MouseEvent) {
      isDrawing.current = true;
      const ctx = canvas!.getContext("2d")!;
      const pos = getPos(canvas!, e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    function draw(e: MouseEvent) {
      if (!isDrawing.current) return;
      const ctx = canvas!.getContext("2d")!;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b";
      const pos = getPos(canvas!, e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    }
    function endDraw() { isDrawing.current = false; }

    function startDrawTouch(e: TouchEvent) {
      e.preventDefault();
      isDrawing.current = true;
      const ctx = canvas!.getContext("2d")!;
      const pos = getPos(canvas!, e.touches[0]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
    function drawTouch(e: TouchEvent) {
      if (!isDrawing.current) return;
      e.preventDefault();
      const ctx = canvas!.getContext("2d")!;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1e293b";
      const pos = getPos(canvas!, e.touches[0]);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    }
    function endDrawTouch() { isDrawing.current = false; }

    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mouseleave", endDraw);
    canvas.addEventListener("touchstart", startDrawTouch, { passive: false });
    canvas.addEventListener("touchmove", drawTouch, { passive: false });
    canvas.addEventListener("touchend", endDrawTouch);

    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mouseleave", endDraw);
      canvas.removeEventListener("touchstart", startDrawTouch);
      canvas.removeEventListener("touchmove", drawTouch);
      canvas.removeEventListener("touchend", endDrawTouch);
    };
  }, [open]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function confirm() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) { setOpen(false); return; }

    const old = parseImages(value)[0];
    if (old?.startsWith("blob:")) {
      onUnregisterFile(old);
      URL.revokeObjectURL(old);
    }

    // Composite signature onto a white background before saving
    const flat = document.createElement("canvas");
    flat.width = canvas.width;
    flat.height = canvas.height;
    const flatCtx = flat.getContext("2d")!;
    flatCtx.fillStyle = "#ffffff";
    flatCtx.fillRect(0, 0, flat.width, flat.height);
    flatCtx.drawImage(canvas, 0, 0);

    flat.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "signature.png", { type: "image/png" });
      const objectUrl = URL.createObjectURL(blob);
      onRegisterFile(objectUrl, file);
      onChange(JSON.stringify([objectUrl]));
    }, "image/png");

    setOpen(false);
  }

  function clearSignature() {
    const old = parseImages(value)[0];
    if (old?.startsWith("blob:")) {
      onUnregisterFile(old);
      URL.revokeObjectURL(old);
    }
    onChange("");
  }

  return (
    <>
      <div className="grid gap-2">
        {currentSig ? (
          <>
            <img src={currentSig} alt="Firma" className="h-28 max-w-xs rounded-md border border-border object-contain bg-white" />
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => { setHasDrawn(false); setOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <PencilLine className="h-3.5 w-3.5" />Volver a firmar
              </button>
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium text-destructive hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />Eliminar firma
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => { setHasDrawn(false); setOpen(true); }}
            className="inline-flex w-fit items-center gap-2 px-4 py-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <PencilLine className="h-4 w-4" />Firmar aquí
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
            <div>
              <p className="font-semibold text-sm">Firma</p>
              <p className="text-xs text-muted-foreground">Dibuja tu firma en el área de abajo</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />Limpiar
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted/50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={!hasDrawn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
              >
                <Check className="h-3.5 w-3.5" />Confirmar
              </button>
            </div>
          </div>
          <div className="flex-1 relative bg-slate-50">
            <canvas
              ref={canvasRef}
              width={1200}
              height={800}
              className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <p className="text-muted-foreground text-sm">Dibuja aquí</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

interface SparePart { inventoryItemId: string; quantity: number }

export default function TechTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { ticket, report, template, loading, setTicket, setTemplate } = useTicket(id);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [checkingIn, setCheckingIn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const pendingFilesRef = useRef<Map<string, File>>(new Map());

  // Spare parts state
  const [requiresSpareParts, setRequiresSpareParts] = useState(false);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedQty, setSelectedQty] = useState(1);

  useEffect(() => {
    if (ticket?.status === "PENDING_REPORT" || ticket?.status === "REOPENED") {
      getInventory({ limit: 100 }).then((d) => setInventoryItems(d.items)).catch(() => {});
    }
  }, [ticket?.status]);

  useEffect(() => {
    if (ticket?.status === "REOPENED" && report) {
      setResponses(report.responses);
      setRequiresSpareParts(report.requiresSpareParts);
      if (report.spareParts?.length) {
        setSpareParts(report.spareParts.map((sp) => ({ inventoryItemId: sp.inventoryItemId, quantity: sp.quantity })));
      }
    }
  }, [ticket?.status, report]);

  async function checkinWork() {
    setCheckingIn(true);
    try {
      const updated = await checkinTicket(id);
      setTicket(updated);
      toast({ title: "Check-in registrado", description: "El administrador fue notificado de tu llegada" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setCheckingIn(false);
    }
  }

  async function startWork() {
    setStarting(true);
    try {
      const updated = await startTicket(id);
      setTicket(updated);
      toast({ title: "Trabajo iniciado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setStarting(false);
    }
  }

  async function finishWork() {
    setFinishing(true);
    try {
      const updated = await finishTicket(id);
      setTicket(updated);
      const tmpl = await getTemplateForTicket(id);
      setTemplate(tmpl);
      toast({ title: "Trabajo finalizado", description: "Completa el reporte para cerrar el ticket" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setFinishing(false);
    }
  }

  function addSparePart() {
    if (!selectedItemId) return;
    setSpareParts((prev) => {
      const existing = prev.find((p) => p.inventoryItemId === selectedItemId);
      if (existing) return prev.map((p) => p.inventoryItemId === selectedItemId ? { ...p, quantity: p.quantity + selectedQty } : p);
      return [...prev, { inventoryItemId: selectedItemId, quantity: selectedQty }];
    });
    setSelectedItemId("");
    setSelectedQty(1);
  }

  function submitReport() {
    if (!template || !ticket) return;
    // Validate required fields
    for (const field of template.fields) {
      if (field.required) {
        const val = responses[field.id] ?? "";
        const empty = (field.type === "PHOTO" || field.type === "SIGNATURE") ? !parseImages(val).length : !val.trim();
        if (empty) {
          toast({ variant: "destructive", title: `El campo "${field.label}" es requerido` });
          return;
        }
      }
    }
    if (requiresSpareParts && spareParts.length === 0) {
      toast({ variant: "destructive", title: "Agrega al menos un repuesto requerido" });
      return;
    }

    const isReopened = ticket.status === "REOPENED";
    toast({ title: "Enviando reporte…", description: "Puedes continuar mientras se procesa." });
    router.back();

    // Fire-and-forget: upload any local images then submit/update the report
    const snapshot = { ...responses };
    const filesMap = pendingFilesRef.current;
    void (async () => {
      try {
        const finalResponses = { ...snapshot };
        await Promise.all(
          Object.entries(finalResponses).map(async ([fieldId, value]) => {
            const images = parseImages(value);
            if (!images.some((img) => img.startsWith("blob:"))) return;
            const uploaded = await Promise.all(
              images.map(async (img) => {
                if (!img.startsWith("blob:")) return img;
                const file = filesMap.get(img)!;
                const resized = await resizeToBlob(file);
                return uploadImage(resized, file.name.replace(/\.[^.]+$/, ".jpg"));
              })
            );
            finalResponses[fieldId] = JSON.stringify(uploaded);
          })
        );
        if (isReopened) {
          await updateReportService(id, finalResponses, {
            requiresSpareParts,
            spareParts: requiresSpareParts ? spareParts : [],
          });
          toast({ title: "Reporte actualizado exitosamente" });
        } else {
          await submitReportService(id, finalResponses, {
            requiresSpareParts,
            spareParts: requiresSpareParts ? spareParts : [],
          });
          toast({ title: "Reporte enviado exitosamente" });
        }
      } catch (e) {
        toast({ variant: "destructive", title: "Error al enviar reporte", description: (e as Error).message });
      }
    })();
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
        <PhotoField
          value={value}
          onChange={onChange}
          onRegisterFile={(url, file) => pendingFilesRef.current.set(url, file)}
          onUnregisterFile={(url) => pendingFilesRef.current.delete(url)}
        />
      );
    }
    if (field.type === "SIGNATURE") {
      return (
        <SignatureField
          value={value}
          onChange={onChange}
          onRegisterFile={(url, file) => pendingFilesRef.current.set(url, file)}
          onUnregisterFile={(url) => pendingFilesRef.current.delete(url)}
        />
      );
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
                // reset to placeholder after selection
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
                <span
                  key={opt}
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800"
                >
                  {opt}
                  <button
                    type="button"
                    onClick={() => onChange(JSON.stringify(selected.filter((s) => s !== opt)))}
                    className="hover:text-blue-900 transition-colors"
                    aria-label={`Quitar ${opt}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          {remaining.length === 0 && selected.length === 0 && (
            <p className="text-xs text-muted-foreground">Sin opciones disponibles</p>
          )}
        </div>
      );
    }
    return <Input placeholder={`${field.label}...`} value={value} onChange={(e) => onChange(e.target.value)} />;
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!ticket) return <p className="text-sm text-destructive p-6">Ticket no encontrado</p>;

  return (
    <>
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
            <Button onClick={checkinWork} disabled={checkingIn} className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              {checkingIn ? "Registrando..." : "Registrar llegada"}
            </Button>
          )}
          {ticket.status === "ON_SITE" && (
            <Button onClick={startWork} disabled={starting} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              {starting ? "Iniciando..." : "Iniciar trabajo"}
            </Button>
          )}
          {ticket.status === "IN_PROGRESS" && (
            <Button onClick={finishWork} disabled={finishing} className="w-full">
              <CheckSquare className="h-4 w-4 mr-2" />
              {finishing ? "Finalizando..." : "Finalizar trabajo"}
            </Button>
          )}
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

      {/* Dynamic report form — when PENDING_REPORT (new) or REOPENED (edit existing) */}
      {((ticket.status === "PENDING_REPORT" && !report) || ticket.status === "REOPENED") && template && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {ticket.status === "REOPENED" ? "Corregir reporte" : "Completar reporte"}
            </CardTitle>
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

            {/* Spare parts */}
            <div className="border-t pt-4 grid gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires-spare-parts"
                  checked={requiresSpareParts}
                  onChange={(e) => { setRequiresSpareParts(e.target.checked); if (!e.target.checked) setSpareParts([]); }}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="requires-spare-parts" className="cursor-pointer">
                  ¿El servicio requiere repuestos? <span className="text-destructive">*</span>
                </Label>
              </div>

              {requiresSpareParts && (
                <div className="grid gap-3 pl-7">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 grid gap-1.5">
                      <Label className="text-xs">Repuesto</Label>
                      <select
                        value={selectedItemId}
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Seleccionar item...</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}{item.sku ? ` (${item.sku})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24 grid gap-1.5">
                      <Label className="text-xs">Cantidad</Label>
                      <Input type="number" min={1} value={selectedQty} onChange={(e) => setSelectedQty(Number(e.target.value))} />
                    </div>
                    <Button type="button" size="icon" variant="outline" onClick={addSparePart} disabled={!selectedItemId}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {spareParts.length > 0 && (
                    <div className="grid gap-1.5">
                      {spareParts.map((sp) => {
                        const item = inventoryItems.find((i) => i.id === sp.inventoryItemId);
                        return (
                          <div key={sp.inventoryItemId} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                            <span>{item?.name ?? sp.inventoryItemId}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{sp.quantity} {item?.unit ?? "uds"}</span>
                              <button type="button" onClick={() => setSpareParts((p) => p.filter((x) => x.inventoryItemId !== sp.inventoryItemId))}>
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button onClick={submitReport} className="mt-2">
              {ticket.status === "REOPENED" ? "Actualizar reporte y completar" : "Enviar reporte y completar ticket"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Read-only submitted report — hidden when REOPENED since the editable form is shown instead */}
      {report && template && ticket.status !== "REOPENED" && (
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
                        <span key={v} className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                          {v}
                        </span>
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
            <p className="text-xs text-muted-foreground pt-1">Enviado {formatDate(report.createdAt)}</p>
          </CardContent>
        </Card>
      )}
    </div>

    {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
