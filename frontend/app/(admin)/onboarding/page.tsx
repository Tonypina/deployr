"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Check, Building2, Users, MapPin, Cpu, UserRound,
  TicketIcon, ClipboardList, ShieldCheck, Package, Rocket, PartyPopper, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { updateCompany, getCompany } from "@/lib/services/company";
import { createClient, createBranch, createEquipment, getClients, getBranches } from "@/lib/services/clients";
import { createTechnician } from "@/lib/services/users";
import { createTicket } from "@/lib/services/tickets";
import { createTemplate, addTemplateField } from "@/lib/services/report-templates";
import { createPolicy } from "@/lib/services/policies";
import { createInventoryItem } from "@/lib/services/inventory";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";

// ── Schemas ──────────────────────────────────────────────────────────────────

const step1Schema = z.object({
  name:    z.string().min(2, "Mínimo 2 caracteres"),
  phone:   z.string().optional(),
  address: z.string().optional(),
  giro:    z.string().optional(),
});

const step2Schema = z.object({
  name:         z.string().min(2, "Mínimo 2 caracteres"),
  contactEmail: z.string().email("Email inválido"),
  contactPhone: z.string().optional(),
});

const step3Schema = z.object({
  name:         z.string().min(2, "Mínimo 2 caracteres"),
  address:      z.string().min(3, "Dirección requerida"),
  city:         z.string().optional(),
  phone:        z.string().optional(),
  contactName:  z.string().optional(),
  contactEmail: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().email("Email inválido").optional()
  ),
});

const equipmentItemSchema = z.object({
  name:         z.string().min(2, "Mínimo 2 caracteres"),
  brand:        z.string().optional(),
  model:        z.string().optional(),
  serialNumber: z.string().optional(),
});

const step4Schema = z.object({
  items: z.array(equipmentItemSchema),
});

const step5Schema = z.object({
  name:     z.string().min(2, "Mínimo 2 caracteres"),
  email:    z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  phone:    z.string().optional(),
});

const step6Schema = z.object({
  title:       z.string().min(3, "Mínimo 3 caracteres"),
  description: z.string().optional(),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
});

const templateFieldSchema = z.object({
  label:    z.string().min(1, "Etiqueta requerida"),
  type:     z.enum(["TEXT", "TEXTAREA", "DATE", "NUMBER", "PHOTO", "MULTISELECT"]),
  required: z.boolean(),
  options:  z.string().optional(),
});

const step7Schema = z.object({
  name:        z.string().min(2, "Mínimo 2 caracteres"),
  description: z.string().optional(),
  fields:      z.array(templateFieldSchema),
});

const step8Schema = z.object({
  name:       z.string().min(2, "Mínimo 2 caracteres"),
  startDate:  z.string().min(1, "Fecha requerida"),
  endDate:    z.string().min(1, "Fecha requerida"),
  recurrence: z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
});

const step9Schema = z.object({
  name:     z.string().min(2, "Mínimo 2 caracteres"),
  sku:      z.string().optional(),
  quantity: z.coerce.number().min(0, "La cantidad no puede ser negativa"),
  unit:     z.string().optional(),
});

type Step1Values = z.infer<typeof step1Schema>;
type Step2Values = z.infer<typeof step2Schema>;
type Step3Values = z.infer<typeof step3Schema>;
type Step4Values = z.infer<typeof step4Schema>;
type Step5Values = z.infer<typeof step5Schema>;
type Step6Values = z.infer<typeof step6Schema>;
type Step7Values = z.infer<typeof step7Schema>;
type Step8Values = z.infer<typeof step8Schema>;
type Step9Values = z.infer<typeof step9Schema>;

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Tu empresa",           icon: Building2,  required: true,  description: "Completa la información básica de tu empresa." },
  { id: 2, title: "Primer cliente",       icon: Users,      required: true,  description: "Registra el primer cliente al que le darás servicio." },
  { id: 3, title: "Primera sucursal",     icon: MapPin,     required: true,  description: "Agrega la primera ubicación del cliente." },
  { id: 4, title: "Equipos",              icon: Cpu,        required: false, description: "Registra los equipos instalados en la sucursal." },
  { id: 5, title: "Primer técnico",       icon: UserRound,  required: true,  description: "Crea la cuenta del primer técnico de tu equipo." },
  { id: 6, title: "Primer ticket",        icon: TicketIcon, required: false, description: "Abre el primer ticket de servicio." },
  { id: 7, title: "Plantilla de reporte", icon: ClipboardList, required: false, description: "Crea la plantilla que tus técnicos usarán al cerrar tickets." },
  { id: 8, title: "Política de servicio", icon: ShieldCheck,  required: false, description: "Define una política de mantenimiento recurrente." },
  { id: 9, title: "Inventario",           icon: Package,      required: false, description: "Agrega el primer artículo a tu inventario de refacciones." },
];

// ── Step progress indicator ───────────────────────────────────────────────────

function StepIndicator({ currentStep, completedSteps }: { currentStep: number; completedSteps: Set<number> }) {
  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <div className="flex items-start justify-between relative">
        <div className="absolute top-4 left-0 right-0 h-px bg-outline-variant mx-6" />
        {STEPS.map((step) => {
          const done   = completedSteps.has(step.id);
          const active = currentStep === step.id;
          const Icon   = step.icon;
          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all bg-surface",
                done              && "bg-primary border-primary text-white",
                active && !done   && "border-primary text-primary",
                !active && !done  && "border-outline-variant text-on-surface-variant",
              )}>
                {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight hidden md:block",
                (active || done) ? "text-primary" : "text-on-surface-variant",
              )}>
                {step.title}
              </span>
              {!step.required && (
                <span className="text-[9px] text-on-surface-variant hidden md:block">Opcional</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type View = "welcome" | "steps" | "success";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, token, setAuth } = useAuthStore();
  const [view, setView]                     = useState<View>("welcome");
  const [currentStep, setCurrentStep]       = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [saving, setSaving]                 = useState(false);
  const [initializing, setInitializing]     = useState(true);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [createdBranchId, setCreatedBranchId] = useState<string | null>(null);
  const [createdTechId, setCreatedTechId]     = useState<string | null>(null);

  useEffect(() => {
    if (user?.onboardingCompleted === true) router.replace("/admin");
  }, [user, router]);

  // Restore progress from server on mount
  useEffect(() => {
    async function init() {
      try {
        const company = await getCompany();
        const savedStep = company.onboardingStep ?? 0;

        if (savedStep > 0) {
          setView("steps");
          setCurrentStep(savedStep);
          setCompletedSteps(new Set(Array.from({ length: savedStep - 1 }, (_, i) => i + 1)));

          // Re-fetch IDs created in earlier steps so current and future steps can use them
          if (savedStep >= 3) {
            const { clients } = await getClients({ limit: 1 });
            if (clients[0]) {
              setCreatedClientId(clients[0].id);
              if (savedStep === 4) {
                const branches = await getBranches(clients[0].id);
                if (branches[0]) setCreatedBranchId(branches[0].id);
              }
            }
          }
          if (savedStep >= 6) {
            const res = await api.get<{ users: { id: string }[] }>("/api/users?role=TECHNICIAN&limit=1");
            if (res.data?.users[0]) setCreatedTechId(res.data.users[0].id);
          }
        }
      } catch {
        // start fresh on any error
      } finally {
        setInitializing(false);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function markDone(step: number) {
    setCompletedSteps((prev) => new Set([...prev, step]));
  }

  async function saveProgress(nextStep: number) {
    try {
      await api.patch("/api/company/onboarding-step", { step: nextStep });
    } catch {
      // non-fatal — UX continues even if save fails
    }
  }

  async function completeOnboarding() {
    try {
      await api.patch("/api/company/complete-onboarding", {});
      if (user && token) setAuth({ ...user, onboardingCompleted: true }, token);
      setView("success");
    } catch {
      toast({ variant: "destructive", title: "Error al finalizar la configuración" });
    }
  }

  if (initializing) return null;
  if (view === "welcome") return <WelcomeScreen userName={user?.name} onStart={() => { saveProgress(1); setView("steps"); }} />;
  if (view === "success") return <SuccessScreen onEnter={() => router.replace("/admin")} />;

  const step = STEPS[currentStep - 1];

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-outline-variant bg-surface shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Image src="/logo.png" alt="deployr" width={90} height={36} className="object-contain object-left" />
          <span className="text-sm text-on-surface-variant">Configuración inicial</span>
        </div>
      </header>

      <div className="border-b border-outline-variant bg-surface shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-5">
          <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Paso {currentStep} de {STEPS.length}
              </span>
              {!step.required && (
                <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium">Opcional</span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold">{step.title}</h1>
            <p className="text-sm text-on-surface-variant mt-1">{step.description}</p>
          </div>

          {currentStep === 1 && (
            <Step1Form saving={saving} setSaving={setSaving} initialName={user?.name}
              onSuccess={() => { setSaving(false); markDone(1); saveProgress(2); setCurrentStep(2); }} />
          )}
          {currentStep === 2 && (
            <Step2Form saving={saving} setSaving={setSaving}
              onSuccess={(id) => { setSaving(false); markDone(2); setCreatedClientId(id); saveProgress(3); setCurrentStep(3); }} />
          )}
          {currentStep === 3 && (
            <Step3Form saving={saving} setSaving={setSaving} clientId={createdClientId}
              onSuccess={(id) => { setSaving(false); markDone(3); setCreatedBranchId(id); saveProgress(4); setCurrentStep(4); }} />
          )}
          {currentStep === 4 && (
            <Step4Form saving={saving} setSaving={setSaving} clientId={createdClientId} branchId={createdBranchId}
              onSuccess={() => { setSaving(false); markDone(4); saveProgress(5); setCurrentStep(5); }}
              onSkip={() => { saveProgress(5); setCurrentStep(5); }} />
          )}
          {currentStep === 5 && (
            <Step5Form saving={saving} setSaving={setSaving}
              onSuccess={(id) => { setSaving(false); markDone(5); setCreatedTechId(id); saveProgress(6); setCurrentStep(6); }} />
          )}
          {currentStep === 6 && (
            <Step6Form saving={saving} setSaving={setSaving} clientId={createdClientId} techId={createdTechId}
              onSuccess={() => { setSaving(false); markDone(6); saveProgress(7); setCurrentStep(7); }}
              onSkip={() => { saveProgress(7); setCurrentStep(7); }} />
          )}
          {currentStep === 7 && (
            <Step7Form saving={saving} setSaving={setSaving}
              onSuccess={() => { setSaving(false); markDone(7); saveProgress(8); setCurrentStep(8); }}
              onSkip={() => { saveProgress(8); setCurrentStep(8); }} />
          )}
          {currentStep === 8 && (
            <Step8Form saving={saving} setSaving={setSaving} clientId={createdClientId}
              onSuccess={() => { setSaving(false); markDone(8); saveProgress(9); setCurrentStep(9); }}
              onSkip={() => { saveProgress(9); setCurrentStep(9); }} />
          )}
          {currentStep === 9 && (
            <Step9Form saving={saving} setSaving={setSaving}
              onSuccess={() => { setSaving(false); markDone(9); completeOnboarding(); }}
              onSkip={completeOnboarding} />
          )}
        </div>
      </main>
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ userName, onStart }: { userName?: string; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-outline-variant bg-surface shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Image src="/logo.png" alt="deployr" width={90} height={36} className="object-contain object-left" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center max-w-4xl mx-auto px-4 py-4 rounded">
            <Image src="/logo.png" alt="deployr" width={120} height={36} className="object-contain object-left" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">
            {userName ? `¡Bienvenido, ${userName.split(" ")[0]}!` : "¡Bienvenido!"}
          </h1>
          <p className="text-on-surface-variant text-base mb-8 leading-relaxed">
            Estás a pocos pasos de tener deployr configurado y listo para operar. Esta guía te llevará por la configuración inicial de tu cuenta.
          </p>

          <div className="grid gap-3 text-left mb-10">
            {STEPS.filter((s) => s.required).map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-surface border border-outline-variant">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-on-surface-variant">{s.description}</p>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-on-surface-variant text-center pt-1">
              + 4 pasos opcionales: equipos, plantilla de reporte, política de servicio e inventario
            </p>
          </div>

          <Button size="lg" className="w-full sm:w-auto px-10" onClick={onStart}>
            Comenzar configuración
          </Button>
        </div>
      </main>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-outline-variant bg-surface shrink-0">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Image src="/logo.png" alt="deployr" width={90} height={36} className="object-contain object-left" />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 text-green-600 mb-6">
            <PartyPopper className="h-8 w-8" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-3">¡Todo listo!</h1>
          <p className="text-on-surface-variant text-base mb-2 leading-relaxed">
            Tu cuenta está configurada y lista para usar.
          </p>
          <p className="text-on-surface-variant text-sm mb-10">
            Puedes agregar más clientes, técnicos, equipos e inventario en cualquier momento desde el panel.
          </p>
          <Button size="lg" className="w-full sm:w-auto px-10" onClick={onEnter}>
            Ir al panel
          </Button>
        </div>
      </main>
    </div>
  );
}

// ── Step 1: Company info ──────────────────────────────────────────────────────

function Step1Form({ saving, setSaving, onSuccess, initialName }: {
  saving: boolean; setSaving: (v: boolean) => void; onSuccess: () => void; initialName?: string;
}) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<Step1Values>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: initialName ?? "" },
  });

  async function onSubmit(data: Step1Values) {
    setSaving(true);
    try {
      await updateCompany({ name: data.name, phone: data.phone || null, address: data.address || null, giro: data.giro || null });
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al guardar", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s1-name">Nombre de la empresa *</Label>
            <Input id="s1-name" placeholder="Mi Empresa S.A. de C.V." className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s1-phone">Teléfono</Label>
            <Input id="s1-phone" placeholder="+52 55 0000 0000" {...register("phone")} />
          </div>
          <div className="grid gap-2">
            <Label>Dirección</Label>
            <Controller name="address" control={control} render={({ field }) => (
              <AddressAutocomplete value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur}
                placeholder="Av. Reforma 123, Col. Centro, CDMX" />
            )} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s1-giro">Giro / Sector</Label>
            <Input id="s1-giro" placeholder="Ej. Refrigeración comercial, HVAC, Electrónica..." {...register("giro")} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 2: First client ──────────────────────────────────────────────────────

function Step2Form({ saving, setSaving, onSuccess }: {
  saving: boolean; setSaving: (v: boolean) => void; onSuccess: (clientId: string) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step2Values>({
    resolver: zodResolver(step2Schema),
  });

  async function onSubmit(data: Step2Values) {
    setSaving(true);
    try {
      const { id } = await createClient({ name: data.name, contactEmail: data.contactEmail, contactPhone: data.contactPhone || undefined });
      onSuccess(id);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear cliente", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s2-name">Nombre del cliente *</Label>
            <Input id="s2-name" placeholder="Empresa ABC S.A. de C.V." className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s2-email">Email de contacto *</Label>
            <Input id="s2-email" type="email" placeholder="contacto@empresa.com" className={cn(errors.contactEmail && "border-destructive")} {...register("contactEmail")} />
            {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s2-phone">Teléfono</Label>
            <Input id="s2-phone" placeholder="+52 55 0000 0000" {...register("contactPhone")} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 3: First branch ──────────────────────────────────────────────────────

function Step3Form({ saving, setSaving, clientId, onSuccess }: {
  saving: boolean; setSaving: (v: boolean) => void; clientId: string | null; onSuccess: (branchId: string) => void;
}) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<Step3Values>({
    resolver: zodResolver(step3Schema),
  });

  async function onSubmit(data: Step3Values) {
    if (!clientId) return;
    setSaving(true);
    try {
      const res = await api.post<{ id: string }>(`/api/clients/${clientId}/branches`, {
        name: data.name,
        address: data.address,
        city: data.city || undefined,
        phone: data.phone || undefined,
        contactName: data.contactName || undefined,
        contactEmail: data.contactEmail || undefined,
      });
      onSuccess(res.data!.id);
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear sucursal", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s3-name">Nombre de la sucursal *</Label>
            <Input id="s3-name" placeholder="Sucursal Centro" className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Dirección *</Label>
            <Controller name="address" control={control} render={({ field }) => (
              <AddressAutocomplete value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur}
                placeholder="Av. Principal 456, Col. Centro"
                className={cn(errors.address && "border-destructive")} />
            )} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="s3-city">Ciudad</Label>
              <Input id="s3-city" placeholder="Monterrey" {...register("city")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s3-phone">Teléfono</Label>
              <Input id="s3-phone" placeholder="+52 81 0000 0000" {...register("phone")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="s3-contact">Nombre del contacto</Label>
              <Input id="s3-contact" placeholder="Juan Pérez" {...register("contactName")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s3-cemail">Email del contacto</Label>
              <Input id="s3-cemail" type="email" placeholder="sucursal@empresa.com"
                className={cn(errors.contactEmail && "border-destructive")} {...register("contactEmail")} />
              {errors.contactEmail && <p className="text-xs text-destructive">{errors.contactEmail.message}</p>}
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 4: Equipment (optional) ─────────────────────────────────────────────

function Step4Form({ saving, setSaving, clientId, branchId, onSuccess, onSkip }: {
  saving: boolean; setSaving: (v: boolean) => void;
  clientId: string | null; branchId: string | null;
  onSuccess: () => void; onSkip: () => void;
}) {
  const { register, control, handleSubmit, formState: { errors } } = useForm<Step4Values>({
    resolver: zodResolver(step4Schema),
    defaultValues: { items: [{ name: "", brand: "", model: "", serialNumber: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  async function onSubmit(data: Step4Values) {
    const filled = data.items.filter((i) => i.name.trim().length >= 2);
    if (!filled.length || !clientId || !branchId) { onSkip(); return; }
    setSaving(true);
    try {
      for (const item of filled) {
        await createEquipment(clientId, branchId, {
          name: item.name,
          brand: item.brand || undefined,
          model: item.model || undefined,
          serialNumber: item.serialNumber || undefined,
        });
      }
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al agregar equipos", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardDescription>
          Agrega los equipos instalados en esta sucursal. Puedes agregar más equipos después desde el detalle del cliente.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          {fields.map((field, idx) => (
            <div key={field.id} className="border border-border rounded-lg p-4 grid gap-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  Equipo {idx + 1}
                </span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(idx)}
                    className="text-destructive hover:opacity-70 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Nombre *</Label>
                <Input placeholder="Compresor Carlyle 06D" {...register(`items.${idx}.name`)}
                  className={cn(errors.items?.[idx]?.name && "border-destructive")} />
                {errors.items?.[idx]?.name && (
                  <p className="text-xs text-destructive">{errors.items[idx]?.name?.message}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Marca</Label>
                  <Input placeholder="Carrier" {...register(`items.${idx}.brand`)} />
                </div>
                <div className="grid gap-2">
                  <Label>Modelo</Label>
                  <Input placeholder="XR15" {...register(`items.${idx}.model`)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>No. de serie</Label>
                <Input placeholder="SN-00000" {...register(`items.${idx}.serialNumber`)} />
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm"
            onClick={() => append({ name: "", brand: "", model: "", serialNumber: "" })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Agregar otro equipo
          </Button>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>Omitir</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 5: First technician ──────────────────────────────────────────────────

function Step5Form({ saving, setSaving, onSuccess }: {
  saving: boolean; setSaving: (v: boolean) => void; onSuccess: (techId: string) => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step5Values>({
    resolver: zodResolver(step5Schema),
  });

  async function onSubmit(data: Step5Values) {
    setSaving(true);
    try {
      await createTechnician({ name: data.name, email: data.email, password: data.password, phone: data.phone || undefined });
      const res = await api.get<{ users: { id: string }[] }>(`/api/users?role=TECHNICIAN&limit=1`);
      onSuccess(res.data?.users[0]?.id ?? "unknown");
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear técnico", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s5-name">Nombre *</Label>
            <Input id="s5-name" placeholder="Juan Pérez" className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s5-email">Email *</Label>
            <Input id="s5-email" type="email" placeholder="tecnico@empresa.com" className={cn(errors.email && "border-destructive")} {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s5-password">Contraseña temporal *</Label>
            <Input id="s5-password" type="password" placeholder="Mín. 8 caracteres" className={cn(errors.password && "border-destructive")} {...register("password")} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s5-phone">Teléfono</Label>
            <Input id="s5-phone" placeholder="+52 55 0000 0000" {...register("phone")} />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 6: First ticket ──────────────────────────────────────────────────────

function Step6Form({ saving, setSaving, clientId, techId, onSuccess, onSkip }: {
  saving: boolean; setSaving: (v: boolean) => void;
  clientId: string | null; techId: string | null; onSuccess: () => void; onSkip: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step6Values>({
    resolver: zodResolver(step6Schema),
    defaultValues: { priority: "MEDIUM" },
  });

  async function onSubmit(data: Step6Values) {
    setSaving(true);
    try {
      await createTicket({
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        clientId: clientId ?? undefined,
        technicianId: techId ?? undefined,
      });
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear ticket", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s6-title">Título *</Label>
            <Input id="s6-title" placeholder="Ej. Revisión de compresor unidad 3" className={cn(errors.title && "border-destructive")} {...register("title")} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s6-desc">Descripción</Label>
            <textarea id="s6-desc" rows={3} placeholder="Detalla el trabajo a realizar..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              {...register("description")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s6-priority">Prioridad *</Label>
            <select id="s6-priority"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("priority")}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>Omitir</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 7: Report template (optional) ───────────────────────────────────────

const FIELD_TYPE_LABELS: Record<string, string> = {
  TEXT: "Texto corto", TEXTAREA: "Texto largo", DATE: "Fecha",
  NUMBER: "Número", PHOTO: "Fotografía", MULTISELECT: "Selección múltiple",
};

function Step7Form({ saving, setSaving, onSuccess, onSkip }: {
  saving: boolean; setSaving: (v: boolean) => void; onSuccess: () => void; onSkip: () => void;
}) {
  const { register, control, watch, handleSubmit, formState: { errors } } = useForm<Step7Values>({
    resolver: zodResolver(step7Schema),
    defaultValues: { fields: [{ label: "", type: "TEXT", required: false, options: "" }] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "fields" });
  const watchedFields = watch("fields");

  async function onSubmit(data: Step7Values) {
    setSaving(true);
    try {
      const tmpl = await createTemplate({ name: data.name, description: data.description || undefined });
      const filled = data.fields.filter((f) => f.label.trim().length >= 1);
      for (let i = 0; i < filled.length; i++) {
        const f = filled[i];
        await addTemplateField(tmpl.id, {
          label: f.label.trim(),
          type: f.type as "TEXT" | "TEXTAREA" | "DATE" | "NUMBER" | "PHOTO" | "MULTISELECT",
          required: f.required,
          order: i + 1,
          options: f.type === "MULTISELECT" && f.options
            ? f.options.split(",").map((o) => o.trim()).filter(Boolean)
            : [],
        });
      }
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear plantilla", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardDescription>
          Las plantillas definen los campos que el técnico debe completar en su reporte de cierre. Puedes agregar más campos después.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s7-name">Nombre de la plantilla *</Label>
            <Input id="s7-name" placeholder="Ej. Mantenimiento preventivo"
              className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s7-desc">Descripción</Label>
            <Input id="s7-desc" placeholder="Para qué tipo de servicio aplica..." {...register("description")} />
          </div>

          <div className="grid gap-3 pt-1">
            <Label className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Campos del reporte
            </Label>
            {fields.map((field, idx) => (
              <div key={field.id} className="border border-border rounded-lg p-4 grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface-variant">Campo {idx + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(idx)}
                      className="text-destructive hover:opacity-70 transition-opacity">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Etiqueta *</Label>
                    <Input placeholder="Ej. Diagnóstico"
                      className={cn(errors.fields?.[idx]?.label && "border-destructive")}
                      {...register(`fields.${idx}.label`)} />
                    {errors.fields?.[idx]?.label && (
                      <p className="text-xs text-destructive">{errors.fields[idx]?.label?.message}</p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Tipo</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...register(`fields.${idx}.type`)}>
                      {Object.entries(FIELD_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {watchedFields?.[idx]?.type === "MULTISELECT" && (
                  <div className="grid gap-2">
                    <Label>Opciones <span className="text-on-surface-variant font-normal">(separadas por coma)</span></Label>
                    <Input placeholder="Opción A, Opción B, Opción C" {...register(`fields.${idx}.options`)} />
                  </div>
                )}
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" className="rounded" {...register(`fields.${idx}.required`)} />
                  Campo obligatorio
                </label>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => append({ label: "", type: "TEXT", required: false, options: "" })}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />Agregar campo
            </Button>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>Omitir</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 8: Policy (optional) ─────────────────────────────────────────────────

function Step8Form({ saving, setSaving, clientId, onSuccess, onSkip }: {
  saving: boolean; setSaving: (v: boolean) => void;
  clientId: string | null; onSuccess: () => void; onSkip: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step8Values>({
    resolver: zodResolver(step8Schema),
  });

  async function onSubmit(data: Step8Values) {
    if (!clientId) { onSkip(); return; }
    setSaving(true);
    try {
      await createPolicy({ name: data.name, clientId, startDate: data.startDate, endDate: data.endDate, recurrence: data.recurrence, equipmentIds: [] });
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al crear política", description: (e as Error).message });
      setSaving(false);
    }
  }

  const recurrenceLabels: Record<string, string> = {
    MONTHLY: "Mensual", BIMONTHLY: "Bimestral", QUARTERLY: "Trimestral", SEMIANNUAL: "Semestral", ANNUAL: "Anual",
  };

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardDescription>
          Una política define visitas de mantenimiento recurrentes para un cliente. Puedes asignar equipos específicos después.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s7-name">Nombre de la política *</Label>
            <Input id="s7-name" placeholder="Mantenimiento preventivo 2026" className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="s7-start">Fecha inicio *</Label>
              <Input id="s7-start" type="date" className={cn(errors.startDate && "border-destructive")} {...register("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s7-end">Fecha fin *</Label>
              <Input id="s7-end" type="date" className={cn(errors.endDate && "border-destructive")} {...register("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s7-rec">Recurrencia *</Label>
            <select id="s7-rec"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("recurrence")}>
              {Object.entries(recurrenceLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>Omitir</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creando..." : "Continuar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Step 9: Inventory (optional) ─────────────────────────────────────────────

function Step9Form({ saving, setSaving, onSuccess, onSkip }: {
  saving: boolean; setSaving: (v: boolean) => void; onSuccess: () => void; onSkip: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<Step9Values>({
    resolver: zodResolver(step9Schema),
    defaultValues: { quantity: 0 },
  });

  async function onSubmit(data: Step9Values) {
    setSaving(true);
    try {
      await createInventoryItem({ name: data.name, sku: data.sku || undefined, quantity: data.quantity, unit: data.unit || undefined });
      onSuccess();
    } catch (e) {
      toast({ variant: "destructive", title: "Error al agregar artículo", description: (e as Error).message });
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-0">
        <CardDescription>
          El inventario te permite rastrear refacciones y materiales utilizados en los servicios.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="s9-name">Nombre del artículo *</Label>
            <Input id="s9-name" placeholder='Filtro de aire HEPA 12"' className={cn(errors.name && "border-destructive")} {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="s9-sku">SKU / Código</Label>
              <Input id="s9-sku" placeholder="FILT-001" {...register("sku")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="s9-unit">Unidad</Label>
              <Input id="s9-unit" placeholder="pza, caja, m..." {...register("unit")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="s9-qty">Cantidad inicial *</Label>
            <Input id="s9-qty" type="number" min="0" className={cn(errors.quantity && "border-destructive")} {...register("quantity")} />
            {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
          </div>
          <div className="flex justify-between pt-2">
            <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>Omitir</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Finalizar"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
