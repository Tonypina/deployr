"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, ChevronDown, ChevronRight, Cpu, Plus } from "lucide-react";
import { Branch, Equipment } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { getBranches, getEquipment, createBranch, createEquipment } from "@/lib/services/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type BranchWithEquipment = Branch & { equipment: Equipment[] | null };

// ── Schemas ──────────────────────────────────────────────────────────────────

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
});

type BranchFormValues = z.infer<typeof branchSchema>;
type EquipmentFormValues = z.infer<typeof equipmentSchema>;

// ── Sub-components ────────────────────────────────────────────────────────────

function BranchForm({ onSave, onCancel }: { onSave: (data: BranchFormValues) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
  });

  async function onSubmit(data: BranchFormValues) {
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

function EquipmentForm({ onSave, onCancel }: { onSave: (data: EquipmentFormValues) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
  });

  async function onSubmit(data: EquipmentFormValues) {
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
        <div className="sm:col-span-2 flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" size="sm" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
        </div>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClientBranchesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [branches, setBranches] = useState<BranchWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [addingEquipmentTo, setAddingEquipmentTo] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!user?.clientId) return;
    try {
      const data = await getBranches(user.clientId);
      setBranches((prev) => {
        const existing = new Map(prev.map((b) => [b.id, b]));
        return data.map((b) => existing.get(b.id) ?? { ...b, equipment: null });
      });
      setExpanded((prev) => new Set([...prev, ...data.map((b) => b.id)]));
    } catch {
      toast({ variant: "destructive", title: "No se pudieron cargar las sucursales" });
      router.replace("/client");
    } finally {
      setLoading(false);
    }
  }, [user?.clientId, router]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  useEffect(() => {
    if (!user?.clientId || !branches.length) return;
    branches.forEach((b) => {
      if (b.equipment !== null) return;
      getEquipment(user.clientId!, b.id)
        .then((eq) => setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, equipment: eq } : x))))
        .catch(() => setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, equipment: [] } : x))));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, user?.clientId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAddBranch(data: BranchFormValues) {
    await createBranch(user!.clientId!, {
      name: data.name,
      address: data.address,
      city: data.city || undefined,
      phone: data.phone || undefined,
      contactName: data.contactName || undefined,
      contactEmail: data.contactEmail || undefined,
    });
    toast({ title: "Sucursal agregada" });
    setShowBranchForm(false);
    await loadBranches();
  }

  async function handleAddEquipment(branchId: string, data: EquipmentFormValues) {
    await createEquipment(user!.clientId!, branchId, {
      name: data.name,
      brand: data.brand || undefined,
      model: data.model || undefined,
      serialNumber: data.serialNumber || undefined,
    });
    toast({ title: "Equipo agregado" });
    setAddingEquipmentTo(null);
    const eq = await getEquipment(user!.clientId!, branchId);
    setBranches((prev) => prev.map((b) => (b.id === branchId ? { ...b, equipment: eq } : b)));
  }

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">
          Mis Sucursales
          {!loading && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({branches.length})</span>
          )}
        </h1>
        {!showBranchForm && (
          <Button variant="outline" size="sm" onClick={() => setShowBranchForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Nueva sucursal
          </Button>
        )}
      </div>

      {/* Add branch form */}
      {showBranchForm && (
        <Card className="border-primary/40">
          <CardHeader><CardTitle className="text-sm">Nueva sucursal</CardTitle></CardHeader>
          <CardContent>
            <BranchForm onSave={handleAddBranch} onCancel={() => setShowBranchForm(false)} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !branches.length && !showBranchForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Sin sucursales</p>
            <p className="text-xs text-muted-foreground">Agrega la primera sucursal de tu empresa</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {branches.map((branch) => {
            const isOpen = expanded.has(branch.id);
            return (
              <Card key={branch.id}>
                {/* Branch header row */}
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() => toggle(branch.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isOpen
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
                </div>

                {/* Equipment section */}
                {isOpen && (
                  <div className="border-t border-border">
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        Equipos
                        <span className="text-muted-foreground font-normal">
                          ({branch.equipment?.length ?? "…"})
                        </span>
                      </div>
                      {addingEquipmentTo !== branch.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setAddingEquipmentTo(branch.id); }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                        </Button>
                      )}
                    </div>

                    {/* Add equipment form */}
                    {addingEquipmentTo === branch.id && (
                      <div className="px-4 pb-4">
                        <div className="border border-primary/40 rounded-lg p-4">
                          <p className="text-sm font-medium mb-3">Nuevo equipo</p>
                          <EquipmentForm
                            onSave={(data) => handleAddEquipment(branch.id, data)}
                            onCancel={() => setAddingEquipmentTo(null)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Equipment list */}
                    {branch.equipment === null ? (
                      <p className="px-4 pb-4 text-xs text-muted-foreground">Cargando equipos...</p>
                    ) : !branch.equipment.length && addingEquipmentTo !== branch.id ? (
                      <p className="px-4 pb-4 text-xs text-muted-foreground">Sin equipos registrados</p>
                    ) : (
                      <div className="px-4 pb-4 grid gap-2">
                        {branch.equipment.map((eq) => (
                          <div
                            key={eq.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{eq.name}</span>
                              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                                {eq.brand && <span>{eq.brand}</span>}
                                {eq.model && <span>Modelo: {eq.model}</span>}
                                {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
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
  );
}
