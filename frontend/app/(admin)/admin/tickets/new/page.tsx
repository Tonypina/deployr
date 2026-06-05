"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Branch, Equipment } from "@/lib/types";
import { useClients } from "@/lib/hooks/use-clients";
import { useTechnicians } from "@/lib/hooks/use-technicians";
import { getBranches, getEquipment } from "@/lib/services/clients";
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
  technicianId: z.string().optional(),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewTicketPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const { clients } = useClients();
  const { technicians: allTechnicians } = useTechnicians();
  const technicians = allTechnicians.filter((t) => t.isActive);

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

  useEffect(() => {
    if (!selectedClientId) {
      setBranches([]);
      setEquipments([]);
      setValue("branchId", "");
      setValue("equipmentId", "");
      return;
    }
    getBranches(selectedClientId).then(setBranches).catch(() => setBranches([]));
    setValue("branchId", "");
    setValue("equipmentId", "");
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
        technicianId: data.technicianId || undefined,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : undefined,
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
        <h1 className="text-2xl font-bold tracking-tight">Nuevo ticket</h1>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Asignación</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="technicianId">Técnico</Label>
                <select
                  id="technicianId"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("technicianId")}
                >
                  <option value="">Sin asignar (Pendiente)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">Si asignas un técnico, el ticket inicia en estado Asignado.</p>
              </div>
            </CardContent>
          </Card>

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
