"use client";

import { useEffect, useState } from "react";
import { Plus, Users, UserCheck, UserX } from "lucide-react";
import { api } from "@/lib/api-client";
import { Technician } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function load() {
    api.get<{ users: Technician[] }>("/api/users?role=TECHNICIAN")
      .then((r) => setTechnicians(r.data?.users ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.post("/api/users", { ...values, role: "TECHNICIAN" });
      toast({ title: "Técnico creado exitosamente" });
      reset();
      setShowForm(false);
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(tech: Technician) {
    try {
      await api.put(`/api/users/${tech.id}`, { isActive: !tech.isActive });
      setTechnicians((prev) => prev.map((t) => t.id === tech.id ? { ...t, isActive: !t.isActive } : t));
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Técnicos</h1>
          <p className="text-muted-foreground text-sm">{technicians.length} técnicos registrados</p>
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
                <Input type="password" {...register("password")} />
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
        <div className="grid gap-3">
          {technicians.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "Activo" : "Inactivo"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.email}</p>
                  {t.phone && <p className="text-xs text-muted-foreground">{t.phone}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleActive(t)}
                  title={t.isActive ? "Desactivar" : "Activar"}
                >
                  {t.isActive ? <UserX className="h-4 w-4 text-destructive" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
