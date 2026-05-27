"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { ReportTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewReportTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const res = await api.post<ReportTemplate>("/api/report-templates", data);
      toast({ title: "Plantilla creada" });
      router.replace(`/admin/reports/${res.data!.id}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <div className="page-stack max-w-lg">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/reports"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Nueva plantilla</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Datos generales</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej. Mantenimiento preventivo"
                className={cn(errors.name && "border-destructive")}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Input id="description" placeholder="Para qué tipo de servicio aplica..." {...register("description")} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/reports">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creando..." : "Crear y agregar campos"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
