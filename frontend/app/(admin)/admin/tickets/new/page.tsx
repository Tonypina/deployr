"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Branch, Equipment, Policy } from "@/lib/types";
import { useClients } from "@/lib/hooks/use-clients";
import { getBranches, getEquipment } from "@/lib/services/clients";
import { listPolicies } from "@/lib/services/policies";
import { createTicket } from "@/lib/services/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  clientId: z.string().min(1, "Selecciona un cliente"),
  branchId: z.string().min(1, "Selecciona una sucursal"),
  equipmentId: z.string().min(1, "Selecciona un equipo"),
  scheduledAt: z.string().optional(),
  policyId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const { clients } = useClients();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const selectedClientId = watch("clientId");
  const selectedBranchId = watch("branchId");
  const selectedPolicyId = watch("policyId");

  useEffect(() => {
    if (!selectedClientId) {
      setBranches([]);
      setEquipments([]);
      setPolicies([]);
      setValue("branchId", "");
      setValue("equipmentId", "");
      setValue("policyId", "");
      return;
    }
    getBranches(selectedClientId).then(setBranches).catch(() => setBranches([]));
    listPolicies({ clientId: selectedClientId, status: "ACTIVE", limit: 100 })
      .then((res) => setPolicies(res.policies))
      .catch(() => setPolicies([]));
    setValue("branchId", "");
    setValue("equipmentId", "");
    setValue("policyId", "");
  }, [selectedClientId, setValue]);

  useEffect(() => {
    if (!selectedBranchId) {
      setEquipments([]);
      setValue("equipmentId", "");
      return;
    }
    getEquipment(selectedClientId!, selectedBranchId).then(setEquipments).catch(() => setEquipments([]));
    setValue("equipmentId", "");
  }, [selectedBranchId, selectedClientId, setValue]);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const ticket = await createTicket({
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        clientId: data.clientId,
        branchId: data.branchId,
        equipmentId: data.equipmentId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
        policyId: data.policyId || undefined,
      });
      toast({ title: "Ticket creado exitosamente" });
      router.replace(`/admin/tickets/${ticket.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear ticket", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tickets"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
              </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="page-stack">
          <Card>
            <CardHeader><CardTitle className="text-base">Información del ticket</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Mantenimiento preventivo..."
                  className={cn(errors.title && "border-destructive")}
                  {...register("title")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>

              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe el problema o el servicio requerido..."
                  {...register("description")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <select
                  id="priority"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("priority")}
                >
                  <option value="LOW">Baja</option>
                  <option value="MEDIUM">Media</option>
                  <option value="HIGH">Alta</option>
                  <option value="URGENT">Urgente</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">Fecha programada</Label>
                <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ubicación</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="clientId">Cliente *</Label>
                <select
                  id="clientId"
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    errors.clientId && "border-destructive"
                  )}
                  {...register("clientId")}
                >
                  <option value="">Seleccionar cliente...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="branchId">Sucursal *</Label>
                <select
                  id="branchId"
                  disabled={!selectedClientId || branches.length === 0}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                    errors.branchId && "border-destructive"
                  )}
                  {...register("branchId")}
                >
                  <option value="">
                    {!selectedClientId ? "Selecciona un cliente primero" : branches.length === 0 ? "Sin sucursales" : "Seleccionar sucursal..."}
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.city ? ` · ${b.city}` : ""}</option>
                  ))}
                </select>
                {errors.branchId && <p className="text-xs text-destructive">{errors.branchId.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="equipmentId">Equipo *</Label>
                <select
                  id="equipmentId"
                  disabled={!selectedBranchId || equipments.length === 0}
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                    errors.equipmentId && "border-destructive"
                  )}
                  {...register("equipmentId")}
                >
                  <option value="">
                    {!selectedBranchId ? "Selecciona una sucursal primero" : equipments.length === 0 ? "Sin equipos en esta sucursal" : "Seleccionar equipo..."}
                  </option>
                  {equipments.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.brand ? ` · ${e.brand}` : ""}</option>
                  ))}
                </select>
                {errors.equipmentId && <p className="text-xs text-destructive">{errors.equipmentId.message}</p>}
              </div>

              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="policyId">Póliza (opcional)</Label>
                <select
                  id="policyId"
                  disabled={!selectedClientId || policies.length === 0}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  {...register("policyId")}
                >
                  <option value="">
                    {!selectedClientId ? "Selecciona un cliente primero" : policies.length === 0 ? "Este cliente no tiene pólizas activas" : "Sin póliza — flujo de cotización"}
                  </option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">
            {selectedPolicyId ? (
              <>Al estar cubierto por una póliza, el ticket inicia en estado <span className="font-medium">Por asignar</span> y omite el proceso de cotización.</>
            ) : (
              <>El ticket inicia en estado <span className="font-medium">Solicitado</span>. Sube la cotización y envíala al cliente para su aprobación antes de asignar un técnico.</>
            )}
          </p>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" asChild>
              <Link href="/admin/tickets">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando..." : "Crear ticket"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
