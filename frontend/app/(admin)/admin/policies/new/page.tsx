"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Cpu, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useClients } from "@/lib/hooks/use-clients";
import { getBranches, getEquipment } from "@/lib/services/clients";
import { createPolicy } from "@/lib/services/policies";
import { Branch, Equipment } from "@/lib/types";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  clientId: z.string().min(1, "Selecciona un cliente"),
  startDate: z.string().min(1, "Fecha requerida"),
  endDate: z.string().min(1, "Fecha requerida"),
  recurrence: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const recurrenceOptions = [
  { value: "MONTHLY",    label: "Mensual"    },
  { value: "BIMONTHLY",  label: "Bimestral"  },
  { value: "QUARTERLY",  label: "Trimestral" },
  { value: "SEMIANNUAL", label: "Semestral"  },
  { value: "ANNUAL",     label: "Anual"      },
];

const PLANS_WITH_POLICIES = new Set(["PROFESIONAL", "EMPRESARIAL"]);

export default function NewPolicyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { clients } = useClients();

  useEffect(() => {
    if (user && user.plan !== undefined && !PLANS_WITH_POLICIES.has(user.plan ?? "")) {
      router.replace("/admin");
    }
  }, [user, router]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, Equipment[]>>({});
  const [selected, setSelected] = useState<{ equipmentId: string; branchId: string }[]>([]);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { recurrence: "MONTHLY" },
  });

  const clientId = watch("clientId");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const recurrence = watch("recurrence");

  function computeTicketCount(): number | null {
    if (!startDate || !endDate || !recurrence) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;
    const months = { MONTHLY: 1, BIMONTHLY: 2, QUARTERLY: 3, SEMIANNUAL: 6, ANNUAL: 12 }[recurrence];
    const addMonths = (d: Date, n: number) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
    let count = 0;
    while (addMonths(start, count * months) <= end) count++;
    return count - 1;
  }

  const ticketCount = computeTicketCount();

  useEffect(() => {
    if (!clientId) { setBranches([]); setEquipmentMap({}); setSelected([]); return; }
    getBranches(clientId).then(setBranches).catch(() => {});
    setEquipmentMap({});
    setSelected([]);
  }, [clientId]);

  const loadEquipment = useCallback(
    (branches: Branch[]) => {
      for (const branch of branches) {
        getEquipment(clientId, branch.id)
          .then((eq) => setEquipmentMap((prev) => ({ ...prev, [branch.id]: eq })))
          .catch(() => {});
      }
    },
    [clientId]
  );

  useEffect(() => { if (branches.length) loadEquipment(branches); }, [branches, loadEquipment]);

  function toggleEquipment(equipmentId: string, branchId: string) {
    setSelected((prev) =>
      prev.some((e) => e.equipmentId === equipmentId)
        ? prev.filter((e) => e.equipmentId !== equipmentId)
        : [...prev, { equipmentId, branchId }]
    );
  }

  async function onSubmit(data: FormData) {
    if (!selected.length) {
      toast({ variant: "destructive", title: "Error", description: "Selecciona al menos un equipo" });
      return;
    }
    setSaving(true);
    try {
      await createPolicy({
        name: data.name,
        clientId: data.clientId,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        recurrence: data.recurrence,
        notes: data.notes,
        equipmentIds: selected,
      });
      toast({ title: "Póliza creada", description: "Se generaron los tickets automáticamente" });
      router.push("/admin/policies");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href="/admin/policies"><ArrowLeft className="h-3.5 w-3.5" /></Link>
          </Button>
          <div>
                        <p className="text-muted-foreground text-sm mt-0.5">Configura los detalles y equipos de la póliza</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Nombre de la póliza</label>
              <Input {...register("name")} placeholder="Ej. Mantenimiento preventivo 2025" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Cliente</label>
              <select
                {...register("clientId")}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Seleccionar cliente...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Fecha inicio</label>
                <Input type="date" {...register("startDate")} />
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Fecha fin</label>
                <Input type="date" {...register("endDate")} />
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Recurrencia</label>
                <select
                  {...register("recurrence")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {recurrenceOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Tickets por equipo</label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
                  {ticketCount !== null ? `${ticketCount} ticket${ticketCount !== 1 ? "s" : ""}` : "—"}
                </div>
                <p className="text-xs text-muted-foreground">Calculado según recurrencia y fechas</p>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Notas <span className="text-muted-foreground">(opcional)</span></label>
              <Input {...register("notes")} placeholder="Observaciones generales..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Equipos incluidos{selected.length > 0 && ` (${selected.length})`}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!clientId ? (
              <p className="text-sm text-muted-foreground">Selecciona un cliente primero</p>
            ) : !branches.length ? (
              <p className="text-sm text-muted-foreground">Este cliente no tiene sucursales registradas</p>
            ) : (
              <div className="grid gap-5">
                {branches.map((branch) => {
                  const equipment = equipmentMap[branch.id];
                  return (
                    <div key={branch.id}>
                      <p className="text-sm font-medium mb-2">
                        {branch.name}{branch.city && <span className="text-muted-foreground font-normal"> · {branch.city}</span>}
                      </p>
                      {!equipment ? (
                        <p className="text-xs text-muted-foreground pl-1">Cargando...</p>
                      ) : !equipment.length ? (
                        <p className="text-xs text-muted-foreground pl-1">Sin equipos en esta sucursal</p>
                      ) : (
                        <div className="grid gap-1">
                          {equipment.map((eq) => {
                            const checked = selected.some((e) => e.equipmentId === eq.id);
                            return (
                              <button
                                key={eq.id}
                                type="button"
                                onClick={() => toggleEquipment(eq.id, branch.id)}
                                className={cn(
                                  "flex items-center gap-2.5 rounded-md border px-3 py-2 text-sm text-left transition-colors",
                                  checked
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border hover:border-primary/30 hover:bg-muted/40"
                                )}
                              >
                                <div className={cn(
                                  "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                  checked ? "bg-primary border-primary" : "border-input"
                                )}>
                                  {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                                </div>
                                <span className="font-medium">{eq.name}</span>
                                {eq.brand && <span className="text-muted-foreground">{eq.brand}</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 pb-6">
          <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Crear póliza"}</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/policies">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
