"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowRight, ChevronLeft } from "lucide-react";
import { register as registerUser } from "@/lib/services/auth";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLAN_LABELS: Record<string, { name: string; price: string; color: string }> = {
  iniciador:   { name: "Iniciador",   price: "$1,799 MXN/mes",       color: "text-on-surface-variant" },
  profesional: { name: "Profesional", price: "$5,299 MXN/mes",       color: "text-primary"            },
  empresarial: { name: "Empresarial", price: "Precios personalizados", color: "text-secondary"          },
};

const schema = z
  .object({
    companyName:     z.string().min(2, "Mínimo 2 caracteres"),
    companyEmail:    z.string().email("Email corporativo inválido"),
    adminName:       z.string().min(2, "Mínimo 2 caracteres"),
    adminEmail:      z.string().email("Email inválido"),
    adminPassword:   z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.adminPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getStrength(pw: string): StrengthLevel {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4) as StrengthLevel;
}

const STRENGTH: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
  0: { label: "",          color: "",                bars: 0 },
  1: { label: "Muy débil", color: "bg-destructive",  bars: 1 },
  2: { label: "Débil",     color: "bg-secondary",    bars: 2 },
  3: { label: "Buena",     color: "bg-yellow-400",   bars: 3 },
  4: { label: "Fuerte",    color: "bg-tertiary",     bars: 4 },
};

const FEATURES = [
  "14 días de prueba gratuita, sin tarjeta",
  "Asigna técnicos y da seguimiento en tiempo real",
  "Clientes con portal de autoservicio incluido",
  "Inventario, pólizas y reportes en un solo lugar",
];

const STATS = [
  { label: "DISPONIBILIDAD", value: "99.9%",   color: "text-primary"   },
  { label: "PRUEBA GRATIS",  value: "14 días", color: "text-tertiary"  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") ?? null;
  const planInfo = selectedPlan ? PLAN_LABELS[selectedPlan] : null;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [passwordVal,  setPasswordVal]  = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const strength = getStrength(passwordVal);
  const { label: strengthLabel, color: strengthColor, bars: strengthBars } = STRENGTH[strength];

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = values;
      const res = await registerUser({ ...payload, plan: selectedPlan ?? undefined });
      setAuth(res.user, res.token);
      router.replace("/admin");
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo crear la cuenta", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex md:grid md:grid-cols-5">

      {/* ── Left panel — branding ── */}
      <div className="hidden md:col-span-2 lg:flex shrink-0 flex-col bg-surface-container-low border-r border-outline-variant/20 p-20 relative overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-tertiary/5 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative shrink-0">
          <Image src="/logo.png" alt="deployr" width={120} height={48} className="object-contain object-left" priority />
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col justify-center relative gap-10">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight leading-tight text-on-surface">
              Dispatch.<br /><span className="text-tertiary">Done Better.</span>
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
              La plataforma de gestión de mantenimiento para equipos que no pueden darse el lujo de fallar.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="glass-card p-4 space-y-1">
                <p className="font-label-caps text-on-surface-variant">{s.label}</p>
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                <CheckCircle2 className="h-4 w-4 text-tertiary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom */}
        <p className="relative text-xs text-on-surface-variant/50 shrink-0">
          © {new Date().getFullYear()} Deployr. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex md:col-span-3 items-center justify-center p-8 md:p-12 overflow-y-auto">
        <div className="w-full space-y-7 py-6">

          {/* Mobile logo */}
          <div className="lg:hidden">
            <Image src="/logo.png" alt="deployr" width={100} height={40} className="object-contain" />
          </div>

          {/* Plan badge */}
          {planInfo && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30">
              <div>
                <p className="font-label-caps text-on-surface-variant mb-0.5">Plan seleccionado</p>
                <p className={cn("text-sm font-semibold", planInfo.color)}>{planInfo.name} — {planInfo.price}</p>
              </div>
              <Link href="/pricing" className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors">
                <ChevronLeft className="h-3 w-3" />Cambiar
              </Link>
            </div>
          )}

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">Crea tu cuenta</h2>
            <p className="text-sm text-on-surface-variant">Comienza con 14 días de prueba gratis, sin tarjeta de crédito</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-3 md:space-y-0 md:grid md:grid-cols-4">

            {/* Company section */}
            <div className="space-y-3 md:col-span-2 md:pr-5">
              <p className="font-label-caps text-on-surface-variant">Empresa</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input
                    id="companyName"
                    placeholder="Servicios XYZ S.A. de C.V."
                    className={cn(errors.companyName && "border-destructive")}
                    {...register("companyName")}
                  />
                  {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companyEmail">Email corporativo</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    placeholder="contacto@empresa.com"
                    autoComplete="off"
                    className={cn(errors.companyEmail && "border-destructive")}
                    {...register("companyEmail")}
                  />
                  {errors.companyEmail && <p className="text-xs text-destructive">{errors.companyEmail.message}</p>}
                </div>
              </div>
              {/* <div className="border-r border-outline-variant/20" /> */}
            </div>

            {/* Admin section */}
            <div className="space-y-3 md:col-span-2 md:pl-5">
              <p className="font-label-caps text-on-surface-variant">Administrador</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="adminName">Nombre completo</Label>
                  <Input
                    id="adminName"
                    placeholder="Juan Pérez"
                    autoComplete="name"
                    className={cn(errors.adminName && "border-destructive")}
                    {...register("adminName")}
                  />
                  {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="adminEmail">Email de acceso</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    placeholder="admin@empresa.com"
                    autoComplete="email"
                    className={cn(errors.adminEmail && "border-destructive")}
                    {...register("adminEmail")}
                  />
                  {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className={cn("pr-10", errors.adminPassword && "border-destructive")}
                    {...register("adminPassword", { onChange: (e) => setPasswordVal(e.target.value) })}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword.message}</p>}
                {passwordVal.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all duration-300",
                            bar <= strengthBars ? strengthColor : "bg-surface-container-highest"
                          )}
                        />
                      ))}
                    </div>
                    {strengthLabel && (
                      <p className={cn(
                        "text-xs font-medium",
                        strength <= 1 ? "text-destructive" :
                        strength === 2 ? "text-secondary" :
                        strength === 3 ? "text-yellow-400" : "text-tertiary"
                      )}>
                        {strengthLabel}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                    className={cn("pr-10", errors.confirmPassword && "border-destructive")}
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 md:col-span-2 md:col-start-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Creando cuenta...</>
              ) : (
                <>Crear cuenta <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-on-surface-variant">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
