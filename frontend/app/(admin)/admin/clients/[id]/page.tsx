"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft, ChevronDown, ChevronRight,
  Plus, Pencil, Trash2, Building2, Cpu, FileText,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Client, Branch, Equipment, ReportTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// ── Extended types ──────────────────────────────────────────────────────────
type BranchWithEquipment = Branch & { equipment: Equipment[] };
type ClientDetail = Client & { branches: BranchWithEquipment[] };

// ── Zod schemas ─────────────────────────────────────────────────────────────
const clientSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  contactEmail: z.string().email("Email inválido"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
});

const branchSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  address: z.string().min(3, "Dirección requerida"),
  city: z.string().optional(),
  phone: z.string().optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Email inválido").optional()
  ),
  contactName: z.string().optional(),
});

const equipmentSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ClientForm = z.infer<typeof clientSchema>;
type BranchForm = z.infer<typeof branchSchema>;
type EquipmentForm = z.infer<typeof equipmentSchema>;

// ── Sub-components ───────────────────────────────────────────────────────────

function InlineClientForm({
  client,
  onSave,
  onCancel,
}: {
  client: ClientDetail;
  onSave: (data: ClientForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client.name,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone ?? "",
      address: client.address ?? "",
    },
  });

  async function onSubmit(data: ClientForm) {
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 grid gap-2">
          <Label>Nombre *</Label>
          <Input className={cn(errors.name && "border-destructive")} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Email de contacto *</Label>
          <Input type="email" className={cn(errors.contactEmail && "border-destructive")} {...register("contactEmail")} />
          {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
        </div>
        <div className="grid gap-2">
          <Label>Teléfono</Label>
          <Input {...register("contactPhone")} />
        </div>
        <div className="sm:col-span-2 grid gap-2">
          <Label>Dirección</Label>
          <Input {...register("address")} />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>
    </form>
  );
}

function BranchForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<BranchForm>;
  onSave: (data: BranchForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: initial?.name ?? "",
      address: initial?.address ?? "",
      city: initial?.city ?? "",
      phone: initial?.phone ?? "",
      contactEmail: initial?.contactEmail ?? "",
      contactName: initial?.contactName ?? "",
    },
  });

  async function onSubmit(data: BranchForm) {
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 grid gap-1.5">
          <Label>Nombre *</Label>
          <Input placeholder="Sucursal Norte" className={cn(errors.name && "border-destructive")} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="sm:col-span-2 grid gap-1.5">
          <Label>Dirección *</Label>
          <Input placeholder="Av. Principal 123" className={cn(errors.address && "border-destructive")} {...register("address")} />
          {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label>Ciudad</Label>
          <Input placeholder="Monterrey" {...register("city")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Teléfono</Label>
          <Input placeholder="+52 81 0000 0000" {...register("phone")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Email de contacto</Label>
          <Input type="email" placeholder="sucursal@empresa.com" className={cn(errors.contactEmail && "border-destructive")} {...register("contactEmail")} />
          {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label>Nombre del contacto</Label>
          <Input placeholder="Juan Pérez" {...register("contactName")} />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>
    </form>
  );
}

function EquipmentForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<EquipmentForm>;
  onSave: (data: EquipmentForm) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      name: initial?.name ?? "",
      brand: initial?.brand ?? "",
      model: initial?.model ?? "",
      serialNumber: initial?.serialNumber ?? "",
      notes: initial?.notes ?? "",
    },
  });

  async function onSubmit(data: EquipmentForm) {
    setSaving(true);
    try { await onSave(data); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 grid gap-1.5">
          <Label>Nombre del equipo *</Label>
          <Input placeholder="Compresor de aire" className={cn(errors.name && "border-destructive")} {...register("name")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="grid gap-1.5">
          <Label>Marca</Label>
          <Input placeholder="Samsung, Grundfos..." {...register("brand")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Modelo</Label>
          <Input placeholder="A200-X" {...register("model")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Número de serie</Label>
          <Input placeholder="SN-00123456" {...register("serialNumber")} />
        </div>
        <div className="grid gap-1.5">
          <Label>Notas</Label>
          <Input placeholder="Observaciones opcionales" {...register("notes")} />
        </div>
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>
    </form>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [assigningTemplate, setAssigningTemplate] = useState(false);

  const [editingClient, setEditingClient] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [addEquipmentBranchId, setAddEquipmentBranchId] = useState<string | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<{ branchId: string; equipment: Equipment } | null>(null);

  async function load() {
    try {
      const [clientRes, tmplRes] = await Promise.all([
        api.get<ClientDetail>(`/api/clients/${id}`),
        api.get<ReportTemplate[]>("/api/report-templates"),
      ]);
      setClient(clientRes.data!);
      setTemplates(tmplRes.data ?? []);
      setExpandedBranches(new Set(clientRes.data!.branches.map((b) => b.id)));
    } catch {
      toast({ variant: "destructive", title: "No se pudo cargar el cliente" });
      router.replace("/admin/clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  function toggleBranch(branchId: string) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      next.has(branchId) ? next.delete(branchId) : next.add(branchId);
      return next;
    });
  }

  // ── Client mutations ──────────────────────────────────────────────────────

  async function deleteClient() {
    if (!confirm(`¿Eliminar a "${client!.name}"? Esta acción eliminará todas sus sucursales, equipos y tickets.`)) return;
    try {
      await api.del(`/api/clients/${id}`);
      toast({ title: "Cliente eliminado" });
      router.replace("/admin/clients");
    } catch (e) {
      toast({ variant: "destructive", title: "Error al eliminar", description: (e as Error).message });
    }
  }

  async function saveClient(data: ClientForm) {
    await api.put(`/api/clients/${id}`, data);
    toast({ title: "Cliente actualizado" });
    setEditingClient(false);
    load();
  }

  async function assignTemplate(templateId: string | null) {
    try {
      await api.patch(`/api/clients/${id}/template`, { templateId });
      toast({ title: templateId ? "Plantilla asignada" : "Plantilla removida" });
      setAssigningTemplate(false);
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  // ── Branch mutations ──────────────────────────────────────────────────────

  async function addBranch(data: BranchForm) {
    await api.post(`/api/clients/${id}/branches`, data);
    toast({ title: "Sucursal agregada" });
    setShowAddBranch(false);
    load();
  }

  async function editBranch(branchId: string, data: BranchForm) {
    await api.put(`/api/clients/${id}/branches/${branchId}`, data);
    toast({ title: "Sucursal actualizada" });
    setEditingBranchId(null);
    load();
  }

  async function deleteBranch(branchId: string) {
    if (!confirm("¿Eliminar esta sucursal y todo su equipamiento?")) return;
    try {
      await api.del(`/api/clients/${id}/branches/${branchId}`);
      toast({ title: "Sucursal eliminada" });
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  // ── Equipment mutations ───────────────────────────────────────────────────

  async function addEquipment(branchId: string, data: EquipmentForm) {
    await api.post(`/api/clients/${id}/branches/${branchId}/equipment`, {
      name: data.name,
      brand: data.brand || undefined,
      model: data.model || undefined,
      serialNumber: data.serialNumber || undefined,
      notes: data.notes || undefined,
    });
    toast({ title: "Equipo agregado" });
    setAddEquipmentBranchId(null);
    load();
  }

  async function saveEquipment(branchId: string, equipmentId: string, data: EquipmentForm) {
    await api.put(`/api/clients/${id}/branches/${branchId}/equipment/${equipmentId}`, {
      name: data.name,
      brand: data.brand || undefined,
      model: data.model || undefined,
      serialNumber: data.serialNumber || undefined,
      notes: data.notes || undefined,
    });
    toast({ title: "Equipo actualizado" });
    setEditingEquipment(null);
    load();
  }

  async function deleteEquipment(branchId: string, equipmentId: string) {
    if (!confirm("¿Eliminar este equipo?")) return;
    try {
      await api.del(`/api/clients/${id}/branches/${branchId}/equipment/${equipmentId}`);
      toast({ title: "Equipo eliminado" });
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;
  if (!client) return null;

  return (
    <div className="page-stack max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight flex-1 truncate">{client.name}</h1>
        {!editingClient && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditingClient(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:border-destructive/60"
              onClick={deleteClient}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />Eliminar
            </Button>
          </>
        )}
      </div>

      {/* Client info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Información del cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingClient ? (
            <InlineClientForm
              client={client}
              onSave={saveClient}
              onCancel={() => setEditingClient(false)}
            />
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-medium">{client.contactEmail}</span>
              </div>
              {client.contactPhone && (
                <div>
                  <span className="text-muted-foreground">Teléfono:</span>{" "}
                  <span className="font-medium">{client.contactPhone}</span>
                </div>
              )}
              {client.address && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Dirección:</span>{" "}
                  <span className="font-medium">{client.address}</span>
                </div>
              )}
              <div className="text-muted-foreground text-xs sm:col-span-2 mt-1">
                Registrado {formatDate(client.createdAt)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report template */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Plantilla de reporte
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setAssigningTemplate(!assigningTemplate)}>
              {assigningTemplate ? "Cancelar" : "Cambiar"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assigningTemplate ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground">Selecciona una plantilla. Si no asignas una, se usará la predeterminada.</p>
              <div className="grid gap-2">
                <button
                  onClick={() => assignTemplate(null)}
                  className={cn(
                    "text-left px-3 py-2 rounded-md border text-sm transition-colors",
                    !client.templateId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                  )}
                >
                  <span className="font-medium">Predeterminada del sistema</span>
                  <p className="text-xs text-muted-foreground">Usa la plantilla marcada como predeterminada</p>
                </button>
                {templates.filter((t) => !t.isDefault).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => assignTemplate(t.id)}
                    className={cn(
                      "text-left px-3 py-2 rounded-md border text-sm transition-colors",
                      client.templateId === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className="font-medium">{t.name}</span>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm">
              {client.templateId
                ? <span className="font-medium">{templates.find((t) => t.id === client.templateId)?.name ?? "Plantilla personalizada"}</span>
                : <span className="text-muted-foreground">Predeterminada del sistema</span>
              }
            </p>
          )}
        </CardContent>
      </Card>

      {/* Branches section */}
      <div>
        <div className="page-header mb-3">
          <h2 className="text-lg font-semibold">
            Sucursales
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({client.branches.length})
            </span>
          </h2>
          {!showAddBranch && (
            <Button variant="outline" size="sm" onClick={() => setShowAddBranch(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva sucursal
            </Button>
          )}
        </div>

        {/* Add branch inline form */}
        {showAddBranch && (
          <Card className="mb-3 border-primary/40">
            <CardHeader><CardTitle className="text-sm">Nueva sucursal</CardTitle></CardHeader>
            <CardContent>
              <BranchForm
                onSave={addBranch}
                onCancel={() => setShowAddBranch(false)}
              />
            </CardContent>
          </Card>
        )}

        {client.branches.length === 0 && !showAddBranch ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 gap-2">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Sin sucursales</p>
              <p className="text-xs text-muted-foreground">Agrega la primera sucursal de este cliente</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {client.branches.map((branch) => {
              const expanded = expandedBranches.has(branch.id);
              const isEditingThis = editingBranchId === branch.id;

              return (
                <Card key={branch.id}>
                  {/* Branch header */}
                  <div
                    className={cn(
                      "flex items-start justify-between gap-3 p-4 cursor-pointer select-none",
                      !isEditingThis && "hover:bg-muted/40 transition-colors"
                    )}
                    onClick={() => !isEditingThis && toggleBranch(branch.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {expanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        }
                        <span className="font-semibold truncate">{branch.name}</span>
                      </div>
                      <div className="pl-6 mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {branch.city && <span>{branch.city}</span>}
                        {branch.address && <span>{branch.address}</span>}
                        {branch.phone && <span>{branch.phone}</span>}
                        {branch.contactEmail && <span>{branch.contactEmail}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingBranchId(isEditingThis ? null : branch.id)}
                        title="Editar sucursal"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteBranch(branch.id)}
                        title="Eliminar sucursal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit branch form */}
                  {isEditingThis && (
                    <div className="px-4 pb-4 border-t border-border pt-4">
                      <BranchForm
                        initial={{
                          name: branch.name,
                          address: branch.address,
                          city: branch.city ?? "",
                          phone: branch.phone ?? "",
                          contactEmail: branch.contactEmail ?? "",
                          contactName: branch.contactName ?? "",
                        }}
                        onSave={(data) => editBranch(branch.id, data)}
                        onCancel={() => setEditingBranchId(null)}
                      />
                    </div>
                  )}

                  {/* Equipment section (collapsible) */}
                  {expanded && !isEditingThis && (
                    <div className="border-t border-border">
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Cpu className="h-4 w-4 text-muted-foreground" />
                          Equipos
                          <span className="text-muted-foreground font-normal">
                            ({branch.equipment.length})
                          </span>
                        </div>
                        {addEquipmentBranchId !== branch.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAddEquipmentBranchId(branch.id);
                              setEditingEquipment(null);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                          </Button>
                        )}
                      </div>

                      {/* Add equipment form */}
                      {addEquipmentBranchId === branch.id && (
                        <div className="px-4 pb-4">
                          <div className="border border-primary/40 rounded-lg p-4">
                            <p className="text-sm font-medium mb-3">Nuevo equipo</p>
                            <EquipmentForm
                              onSave={(data) => addEquipment(branch.id, data)}
                              onCancel={() => setAddEquipmentBranchId(null)}
                            />
                          </div>
                        </div>
                      )}

                      {branch.equipment.length === 0 && addEquipmentBranchId !== branch.id ? (
                        <p className="px-4 pb-4 text-xs text-muted-foreground">Sin equipos registrados</p>
                      ) : (
                        <div className="px-4 pb-4 grid gap-2">
                          {branch.equipment.map((eq) => {
                            const isEditingEq =
                              editingEquipment?.equipment.id === eq.id &&
                              editingEquipment?.branchId === branch.id;

                            return (
                              <div key={eq.id}>
                                {isEditingEq ? (
                                  <div className="border border-primary/40 rounded-lg p-4">
                                    <p className="text-sm font-medium mb-3">Editar equipo</p>
                                    <EquipmentForm
                                      initial={{
                                        name: eq.name,
                                        brand: eq.brand ?? "",
                                        model: eq.model ?? "",
                                        serialNumber: eq.serialNumber ?? "",
                                        notes: eq.notes ?? "",
                                      }}
                                      onSave={(data) => saveEquipment(branch.id, eq.id, data)}
                                      onCancel={() => setEditingEquipment(null)}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                                    <div className="min-w-0 flex-1">
                                      <span className="font-medium">{eq.name}</span>
                                      <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                                        {eq.brand && <span>{eq.brand}</span>}
                                        {eq.model && <span>Modelo: {eq.model}</span>}
                                        {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => setEditingEquipment({ branchId: branch.id, equipment: eq })}
                                        title="Editar"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => deleteEquipment(branch.id, eq.id)}
                                        title="Eliminar"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
