"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Camera, Plus, KeyRound, UserX, UserCheck } from "lucide-react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { getCompany, updateCompany } from "@/lib/services/company";
import { getAdmins, createAdmin, updateUser, resetUserPassword } from "@/lib/services/users";
import { resizeToBlob, uploadImage } from "@/lib/services/upload";
import { Company, Technician } from "@/lib/types";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

// ── Constants ─────────────────────────────────────────────────────────────────

const REGIMENES_FISCALES = [
  "601 - General de Ley Personas Morales",
  "603 - Personas Morales con Fines no Lucrativos",
  "606 - Arrendamiento",
  "608 - Demás ingresos",
  "610 - Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611 - Ingresos por Dividendos (socios y accionistas)",
  "612 - Personas Físicas con Actividades Empresariales y Profesionales",
  "614 - Ingresos por intereses",
  "616 - Sin obligaciones fiscales",
  "621 - Incorporación Fiscal",
  "622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626 - Régimen Simplificado de Confianza",
];

// ── Schemas ───────────────────────────────────────────────────────────────────

const companySchema = z.object({
  name:          z.string().min(2,  "Requerido"),
  email:         z.string().email("Email inválido"),
  phone:         z.string().optional(),
  address:       z.string().optional(),
  rfc:           z.string()
    .refine((v) => !v || /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(v), { message: "RFC inválido (12–13 caracteres)" })
    .optional(),
  razonSocial:   z.string().optional(),
  regimenFiscal: z.string().optional(),
  codigoPostal:  z.string()
    .refine((v) => !v || /^\d{5}$/.test(v), { message: "Debe ser 5 dígitos" })
    .optional(),
  giro:          z.string().optional(),
});

const adminSchema = z.object({
  name:     z.string().min(2,  "Requerido"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(8,  "Mínimo 8 caracteres"),
  phone:    z.string().optional(),
});

const resetSchema = z.object({
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type CompanyForm = z.infer<typeof companySchema>;
type AdminForm   = z.infer<typeof adminSchema>;
type ResetForm   = z.infer<typeof resetSchema>;

// ── Reset password sub-form ───────────────────────────────────────────────────

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(values: ResetForm) {
    setSaving(true);
    try {
      await resetUserPassword(userId, values.password);
      toast({ title: "Contraseña actualizada", description: "El usuario deberá cambiarla en su próximo ingreso." });
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
        <Input type="password" placeholder="Mínimo 8 caracteres" {...register("password")}
          className={cn("h-8 text-sm", errors.password && "border-destructive")} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>
      <Button type="submit" size="sm" disabled={saving} className="h-8">{saving ? "Guardando..." : "Guardar"}</Button>
      <Button type="button" variant="outline" size="sm" onClick={onDone} className="h-8">Cancelar</Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [admins, setAdmins]   = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [savingAdmin, setSavingAdmin]     = useState(false);
  const [resetingId, setResetingId]       = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
  });

  const { register: regAdmin, handleSubmit: handleAdmin, reset: resetAdmin, formState: { errors: adminErrors } } =
    useForm<AdminForm>({ resolver: zodResolver(adminSchema) });

  async function load() {
    try {
      const [co, ad] = await Promise.all([getCompany(), getAdmins({ limit: 50 })]);
      setCompany(co);
      setAdmins(ad.users);
      reset({
        name:          co.name          ?? "",
        email:         co.email         ?? "",
        phone:         co.phone         ?? "",
        address:       co.address       ?? "",
        rfc:           co.rfc           ?? "",
        razonSocial:   co.razonSocial   ?? "",
        regimenFiscal: co.regimenFiscal ?? "",
        codigoPostal:  co.codigoPostal  ?? "",
        giro:          co.giro          ?? "",
      });
    } catch {
      toast({ variant: "destructive", title: "Error al cargar perfil" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSave(values: CompanyForm) {
    setSaving(true);
    try {
      const updated = await updateCompany({
        name:          values.name          || undefined,
        email:         values.email         || undefined,
        phone:         values.phone         || null,
        address:       values.address       || null,
        rfc:           values.rfc           || null,
        razonSocial:   values.razonSocial   || null,
        regimenFiscal: values.regimenFiscal || null,
        codigoPostal:  values.codigoPostal  || null,
        giro:          values.giro          || null,
      });
      setCompany(updated);
      toast({ title: "Perfil actualizado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const resized = await resizeToBlob(file);
      const url = await uploadImage(resized, "company-logo.jpg");
      const updated = await updateCompany({ logoUrl: url });
      setCompany(updated);
      toast({ title: "Logo actualizado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Error al subir logo", description: (e as Error).message });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function onCreateAdmin(values: AdminForm) {
    setSavingAdmin(true);
    try {
      await createAdmin(values);
      toast({ title: "Administrador creado" });
      resetAdmin();
      setShowAdminForm(false);
      const refreshed = await getAdmins({ limit: 50 });
      setAdmins(refreshed.users);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSavingAdmin(false);
    }
  }

  async function toggleAdminActive(id: string, isActive: boolean) {
    try {
      await updateUser(id, { isActive: !isActive });
      setAdmins((prev) => prev.map((a) => a.id === id ? { ...a, isActive: !isActive } : a));
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground p-6">Cargando...</p>;

  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="page-stack max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Perfil de la empresa</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{company?.name}</p>
        </div>
      </div>

      {/* ── Logo ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />Logo</CardTitle></CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative h-20 w-20 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {company?.logoUrl ? (
              <Image src={company.logoUrl} alt="Logo" fill className="object-contain p-1" />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Sube una imagen cuadrada (PNG o JPG). Se redimensionará automáticamente.</p>
            <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={handleLogoChange} />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              {uploadingLogo ? "Subiendo..." : "Cambiar logo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Info general + Datos fiscales ──────────────────────────── */}
      <form onSubmit={handleSubmit(onSave)} className="space-y-6">

        <Card>
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nombre comercial *</Label>
              <Input placeholder="Mi Empresa S.A. de C.V." {...register("name")} className={cn(errors.name && "border-destructive")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="contacto@empresa.com" {...register("email")} className={cn(errors.email && "border-destructive")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label>Teléfono</Label>
              <Input placeholder="+52 55 0000 0000" {...register("phone")} />
            </div>
            <div className="grid gap-2">
              <Label>Giro / Actividad</Label>
              <Input placeholder="Mantenimiento de equipo industrial" {...register("giro")} />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Dirección</Label>
              <Controller
                name="address"
                control={control}
                render={({ field }) => (
                  <AddressAutocomplete
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Av. Reforma 100, Col. Juárez, CDMX"
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos fiscales (México)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Requeridos para la emisión de CFDI 4.0.</p>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>RFC</Label>
              <Input placeholder="ABC123456XY1" {...register("rfc")} className={cn(errors.rfc && "border-destructive")} />
              {errors.rfc
                ? <p className="text-xs text-destructive">{errors.rfc.message}</p>
                : <p className="text-xs text-muted-foreground">12 caracteres (PM) · 13 caracteres (PF)</p>
              }
            </div>
            <div className="grid gap-2">
              <Label>Razón social</Label>
              <Input placeholder="MI EMPRESA SA DE CV" {...register("razonSocial")} />
              <p className="text-xs text-muted-foreground">Tal como aparece en la constancia del SAT</p>
            </div>
            <div className="grid gap-2">
              <Label>Régimen fiscal</Label>
              <select {...register("regimenFiscal")} className={selectClass}>
                <option value="">Seleccionar…</option>
                {REGIMENES_FISCALES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Código postal fiscal</Label>
              <Input placeholder="06600" maxLength={5} {...register("codigoPostal")} className={cn(errors.codigoPostal && "border-destructive")} />
              {errors.codigoPostal && <p className="text-xs text-destructive">{errors.codigoPostal.message}</p>}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>

      {/* ── Administradores ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Administradores</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAdminForm(!showAdminForm)}>
              <Plus className="h-3.5 w-3.5 mr-1" />Nuevo admin
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">

          {showAdminForm && (
            <div className="border border-border rounded-lg p-4 mb-4 space-y-4">
              <p className="text-sm font-semibold">Nuevo administrador</p>
              <form onSubmit={handleAdmin(onCreateAdmin)} className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-xs">Nombre</Label>
                  <Input placeholder="Ana García" {...regAdmin("name")} className={cn("h-8 text-sm", adminErrors.name && "border-destructive")} />
                  {adminErrors.name && <p className="text-xs text-destructive">{adminErrors.name.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" placeholder="admin@empresa.com" {...regAdmin("email")} className={cn("h-8 text-sm", adminErrors.email && "border-destructive")} />
                  {adminErrors.email && <p className="text-xs text-destructive">{adminErrors.email.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Contraseña temporal</Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" {...regAdmin("password")} className={cn("h-8 text-sm", adminErrors.password && "border-destructive")} />
                  {adminErrors.password && <p className="text-xs text-destructive">{adminErrors.password.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Teléfono (opcional)</Label>
                  <Input placeholder="+52 55 0000 0000" {...regAdmin("phone")} className="h-8 text-sm" />
                </div>
                <div className="sm:col-span-2 flex gap-2 justify-end">
                  <Button variant="outline" type="button" size="sm" onClick={() => { setShowAdminForm(false); resetAdmin(); }}>Cancelar</Button>
                  <Button type="submit" size="sm" disabled={savingAdmin}>{savingAdmin ? "Guardando..." : "Crear administrador"}</Button>
                </div>
              </form>
            </div>
          )}

          {admins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sin administradores registrados</p>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="border border-border rounded-lg px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{a.name}</p>
                      <span className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        a.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      )}>
                        {a.isActive ? "Activo" : "Inactivo"}
                      </span>
                      {a.mustChangePassword && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Debe cambiar contraseña
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                    {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setResetingId(resetingId === a.id ? null : a.id)} title="Cambiar contraseña">
                      <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAdminActive(a.id, a.isActive)} title={a.isActive ? "Desactivar" : "Activar"}>
                      {a.isActive
                        ? <UserX className="h-3.5 w-3.5 text-destructive" />
                        : <UserCheck className="h-3.5 w-3.5 text-green-600" />
                      }
                    </Button>
                  </div>
                </div>
                {resetingId === a.id && (
                  <ResetPasswordForm userId={a.id} onDone={() => setResetingId(null)} />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
