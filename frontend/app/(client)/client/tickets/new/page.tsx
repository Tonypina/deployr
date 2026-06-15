"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Branch, Equipment } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
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
  branchId: z.string().min(1, "Selecciona una sucursal"),
  equipmentId: z.string().min(1, "Selecciona un equipo"),
});

type FormValues = z.infer<typeof schema>;

export default function NewClientTicketPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "MEDIUM" },
  });

  const selectedBranchId = watch("branchId");

  useEffect(() => {
    if (!user?.clientId) return;
    getBranches(user.clientId).then(setBranches).catch(() => setBranches([]));
  }, [user?.clientId]);

  useEffect(() => {
    if (!selectedBranchId || !user?.clientId) {
      setEquipments([]);
      setValue("equipmentId", "");
      return;
    }
    getEquipment(user.clientId, selectedBranchId).then(setEquipments).catch(() => setEquipments([]));
    setValue("equipmentId", "");
  }, [selectedBranchId, user?.clientId, setValue]);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      await createTicket({
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        branchId: data.branchId,
        equipmentId: data.equipmentId,
      });
      toast({ title: "Solicitud enviada", description: "Te notificaremos cuando sea atendida." });
      router.replace("/client");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <div className="page-stack max-w-2xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/client"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
              </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="page-stack">
          <Card>
            <CardHeader><CardTitle className="text-base">Descripción del problema</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Ej. Falla en compresor de aire"
                  className={cn(errors.title && "border-destructive")}
                  {...register("title")}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Describe el problema con más detalle..."
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ubicación del equipo *</CardTitle></CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="branchId">Sucursal *</Label>
                <select
                  id="branchId"
                  className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    errors.branchId && "border-destructive"
                  )}
                  {...register("branchId")}
                >
                  <option value="">Seleccionar sucursal...</option>
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

          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" asChild>
              <Link href="/client">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
