"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { createClient, createBranch } from "@/lib/services/clients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  contactEmail: z.string().email("Email inválido"),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  branches: z.array(branchSchema),
});

type FormValues = z.infer<typeof schema>;

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ // control already present via useFieldArray
    resolver: zodResolver(schema),
    defaultValues: { branches: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "branches" });

  function addBranch() {
    append({ name: "", address: "", city: "", phone: "", contactEmail: "", contactName: "" });
  }

  async function onSubmit(data: FormValues) {
    setSaving(true);
    try {
      const { id: clientId } = await createClient({
        name: data.name,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone || undefined,
        address: data.address || undefined,
      });

      for (const branch of data.branches) {
        await createBranch(clientId, {
          name: branch.name,
          address: branch.address,
          city: branch.city || undefined,
          phone: branch.phone || undefined,
          contactEmail: branch.contactEmail || undefined,
          contactName: branch.contactName || undefined,
        });
      }

      toast({ title: "Cliente creado exitosamente" });
      router.replace(`/admin/clients/${clientId}`);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear cliente", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/clients"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
              </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="page-stack">
          {/* Client info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Información del cliente</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Empresa ABC S.A. de C.V."
                  className={cn(errors.name && "border-destructive")}
                  {...register("name")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Email de contacto *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="contacto@empresa.com"
                  className={cn(errors.contactEmail && "border-destructive")}
                  {...register("contactEmail")}
                />
                {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactPhone">Teléfono</Label>
                <Input
                  id="contactPhone"
                  placeholder="+52 55 0000 0000"
                  {...register("contactPhone")}
                />
              </div>

              <div className="sm:col-span-2 grid gap-2">
                <Label>Dirección</Label>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <AddressAutocomplete
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Av. Reforma 123, Col. Centro"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Branches */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Sucursales
                  {fields.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">({fields.length})</span>
                  )}
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addBranch}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Agregar sucursal
                </Button>
              </div>
            </CardHeader>

            {fields.length === 0 ? (
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Sin sucursales. Puedes agregarlas ahora o después desde el detalle del cliente.
                </p>
              </CardContent>
            ) : (
              <CardContent className="grid gap-4">
                {fields.map((field, idx) => (
                  <div key={field.id} className="border border-border rounded-lg p-4 grid gap-4 sm:grid-cols-2 relative">
                    <div className="sm:col-span-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-muted-foreground">Sucursal {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="sm:col-span-2 grid gap-2">
                      <Label>Nombre *</Label>
                      <Input
                        placeholder="Sucursal Norte"
                        className={cn(errors.branches?.[idx]?.name && "border-destructive")}
                        {...register(`branches.${idx}.name`)}
                      />
                      {errors.branches?.[idx]?.name && (
                        <p className="text-xs text-destructive">{errors.branches[idx]?.name?.message}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 grid gap-2">
                      <Label>Dirección *</Label>
                      <Controller
                        name={`branches.${idx}.address`}
                        control={control}
                        render={({ field }) => (
                          <AddressAutocomplete
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            placeholder="Av. Principal 456"
                            className={cn(errors.branches?.[idx]?.address && "border-destructive")}
                          />
                        )}
                      />
                      {errors.branches?.[idx]?.address && (
                        <p className="text-xs text-destructive">{errors.branches[idx]?.address?.message}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label>Ciudad</Label>
                      <Input placeholder="Monterrey" {...register(`branches.${idx}.city`)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Teléfono</Label>
                      <Input placeholder="+52 81 0000 0000" {...register(`branches.${idx}.phone`)} />
                    </div>

                    <div className="grid gap-2">
                      <Label>Email de contacto</Label>
                      <Input
                        type="email"
                        placeholder="sucursal@empresa.com"
                        className={cn(errors.branches?.[idx]?.contactEmail && "border-destructive")}
                        {...register(`branches.${idx}.contactEmail`)}
                      />
                      {errors.branches?.[idx]?.contactEmail && (
                        <p className="text-xs text-destructive">{errors.branches[idx]?.contactEmail?.message}</p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label>Nombre del contacto</Label>
                      <Input placeholder="Juan Pérez" {...register(`branches.${idx}.contactName`)} />
                    </div>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" type="button" asChild>
              <Link href="/admin/clients">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creando..." : "Crear cliente"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
