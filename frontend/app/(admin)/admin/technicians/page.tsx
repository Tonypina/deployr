"use client";

import { useState } from "react";
import { Plus, Users, UserCheck, UserX, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTechnicians } from "@/lib/hooks/use-technicians";
import { createTechnician, updateUser, resetUserPassword } from "@/lib/services/users";
import { Pagination } from "@/components/ui/pagination";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

const resetSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;
type ResetValues = z.infer<typeof resetSchema>;

function ResetPasswordForm({ techId, onDone }: { techId: string; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: ResetValues) {
    setSaving(true);
    try {
      await resetUserPassword(techId, values.password);
      toast({ title: "Contraseña actualizada", description: "El técnico deberá cambiarla en su próximo ingreso." });
      reset();
      onDone();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2 pt-3 border-t border-border mt-3">
      <div className="flex-1 grid gap-1.5">
        <Label className="text-xs">Nueva contraseña temporal</Label>
        <Input
          type="password"
          placeholder="Mínimo 8 caracteres"
          {...register("password")}
          className={cn("h-8 text-sm", errors.password && "border-destructive")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="sm" disabled={saving} className="h-8">
        {saving ? "Guardando..." : "Guardar"}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDone} className="h-8">
        Cancelar
      </Button>
    </form>
  );
}

export default function TechniciansPage() {
  const { technicians, total, page, limit, loading, refetch, goToPage } = useTechnicians();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetingId, setResetingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await createTechnician(values);
      toast({ title: "Técnico creado exitosamente" });
      reset();
      setShowForm(false);
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await updateUser(id, { isActive: !isActive });
      refetch();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Técnicos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} técnicos registrados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo técnico
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Registrar técnico</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input placeholder="Carlos Mendoza" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="tecnico@empresa.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Contraseña temporal</Label>
                <Input type="password" placeholder="Mínimo 8 caracteres" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Teléfono (opcional)</Label>
                <Input placeholder="+52 55 0000 0000" {...register("phone")} />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !technicians.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin técnicos</p>
            <p className="text-sm text-muted-foreground">Agrega tu primer técnico</p>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid gap-3">
          {technicians.map((t) => (
            <Card key={t.id}>
              <CardContent className="card-content-tight">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{t.name}</p>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        t.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      )}>
                        {t.isActive ? "Activo" : "Inactivo"}
                      </span>
                      {t.mustChangePassword && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Debe cambiar contraseña
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{t.email}</p>
                    {t.phone && <p className="text-xs text-muted-foreground">{t.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setResetingId(resetingId === t.id ? null : t.id)}
                      title="Cambiar contraseña"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleActive(t.id, t.isActive)}
                      title={t.isActive ? "Desactivar" : "Activar"}
                    >
                      {t.isActive ? <UserX className="h-3.5 w-3.5 text-destructive" /> : <UserCheck className="h-3.5 w-3.5 text-green-600" />}
                    </Button>
                  </div>
                </div>
                {resetingId === t.id && (
                  <ResetPasswordForm techId={t.id} onDone={() => setResetingId(null)} />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <Pagination page={page} total={total} limit={limit} onPage={goToPage} />
        </>
      )}
    </div>
  );
}
