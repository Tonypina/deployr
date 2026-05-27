"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Branch, ScheduledVisit } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { visitStatusLabel, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";

const schema = z.object({
  requestedAt: z.string().min(1, "Selecciona fecha y hora"),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function SchedulePage() {
  const { user } = useAuthStore();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [visits, setVisits] = useState<ScheduledVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function loadVisits() {
    api.get<ScheduledVisit[]>("/api/visits")
      .then((r) => setVisits(r.data ?? []))
      .catch(console.error);
  }

  useEffect(() => {
    if (!user?.clientId) return;
    Promise.all([
      // Fetch branches for this client — requires knowing clientId
      // We hit the client detail endpoint via clientId stored in user
      api.get<Branch[]>(`/api/clients/${user.clientId}/branches`).catch(() => ({ data: [] as Branch[] })),
      api.get<ScheduledVisit[]>("/api/visits"),
    ]).then(([bRes, vRes]) => {
      setBranches((bRes as { data: Branch[] }).data ?? []);
      setVisits(vRes.data ?? []);
    }).finally(() => setLoading(false));
  }, [user]);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.post("/api/visits", {
        ...values,
        requestedAt: new Date(values.requestedAt).toISOString(),
      });
      toast({ title: "Visita agendada. El equipo confirmará pronto." });
      reset();
      loadVisits();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack max-w-2xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agendar visita</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Solicita una visita técnica</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Nueva solicitud</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Fecha y hora deseada *</Label>
              <Input type="datetime-local" {...register("requestedAt")} min={new Date().toISOString().slice(0, 16)} />
              {errors.requestedAt && <p className="text-xs text-destructive">{errors.requestedAt.message}</p>}
            </div>
            {branches.length > 0 && (
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register("branchId")}
                >
                  <option value="">Seleccionar sucursal</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}{b.city ? ` - ${b.city}` : ""}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Notas adicionales</Label>
              <textarea
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Describe el motivo o equipo a revisar..."
                {...register("notes")}
              />
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Agendando..." : "Solicitar visita"}</Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Mis solicitudes</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : !visits.length ? (
          <p className="text-sm text-muted-foreground">Sin visitas agendadas</p>
        ) : (
          <div className="grid gap-3">
            {visits.map((v) => (
              <Card key={v.id}>
                <CardContent className="card-content-tight flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{formatDate(v.requestedAt)}</p>
                    {v.branch && <p className="text-sm text-muted-foreground">{v.branch.name}</p>}
                    {v.notes && <p className="text-sm text-muted-foreground">{v.notes}</p>}
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                    {visitStatusLabel[v.status]}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
