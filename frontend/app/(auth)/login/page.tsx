"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { login } from "@/lib/services/auth";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Ingresa un email válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type FormValues = z.infer<typeof schema>;

const FEATURES = [
  "Tickets, técnicos y clientes en un solo lugar",
  "Pólizas y mantenimiento programado",
  "Portal de autoservicio para tus clientes",
];

const STATS = [
  { label: "DISPONIBILIDAD", value: "99.9%", color: "text-primary" },
  { label: "PRUEBA GRATIS", value: "14 días", color: "text-tertiary" },
];

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await login(values.email, values.password);
      setAuth(res.user, res.token);
      if (res.user.mustChangePassword) { router.replace("/change-password"); return; }
      if (res.user.role === "ADMIN") router.replace("/admin");
      else if (res.user.role === "TECHNICIAN") router.replace("/tech");
      else router.replace("/client");
    } catch (err) {
      toast({ variant: "destructive", title: "No se pudo iniciar sesión", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex md:grid md:grid-cols-5">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex md:col-span-3 shrink-0 flex-col bg-surface-container-low border-r border-outline-variant/20 p-20 relative overflow-hidden">
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
      <div className="flex-1 flex md:col-span-2 items-center justify-center p-8 md:p-12">
        <div className="w-full max-w-[400px] space-y-8">

          {/* Mobile logo */}
          <div className="lg:hidden">
            <Image src="/logo.png" alt="deployr" width={100} height={40} className="object-contain" />
          </div>

          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-on-surface">Bienvenido de vuelta</h2>
            <p className="text-sm text-on-surface-variant">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                className={cn(errors.email && "border-destructive")}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn("pr-10", errors.password && "border-destructive")}
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Ingresando...</>
              ) : (
                <>Iniciar sesión <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-on-surface-variant">
            ¿Eres una empresa nueva?{" "}
            <Link href="/pricing" className="text-primary font-medium hover:underline">
              Ver planes
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
