"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Building2, User, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    companyName: z.string().min(2, "Mínimo 2 caracteres"),
    companyEmail: z.string().email("Email corporativo inválido"),
    adminName: z.string().min(2, "Mínimo 2 caracteres"),
    adminEmail: z.string().email("Email inválido"),
    adminPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.adminPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;
type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4) as StrengthLevel;
}

const strengthConfig: Record<StrengthLevel, { label: string; color: string; bars: number }> = {
  0: { label: "", color: "", bars: 0 },
  1: { label: "Muy débil", color: "bg-red-500", bars: 1 },
  2: { label: "Débil", color: "bg-orange-400", bars: 2 },
  3: { label: "Buena", color: "bg-yellow-400", bars: 3 },
  4: { label: "Fuerte", color: "bg-green-500", bars: 4 },
};

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const strength = getPasswordStrength(passwordValue);
  const { label: strengthLabel, color: strengthColor, bars: strengthBars } = strengthConfig[strength];

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = values;
      const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", payload);
      setAuth(res.data!.user, res.data!.token);
      router.replace("/admin");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo crear la cuenta",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="px-6 pb-2">
        <h2 className="text-xl font-bold text-slate-900">Crea tu cuenta</h2>
        <p className="text-slate-500 text-sm mt-1">Registra tu empresa y comienza a gestionar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-body">
          {/* Company section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Empresa
              </span>
            </div>
            <div className="space-y-1.5 pl-7">
              <Label htmlFor="companyName">Nombre de la empresa</Label>
              <Input
                id="companyName"
                placeholder="Servicios XYZ S.A. de C.V."
                className={cn(errors.companyName && "border-destructive")}
                {...register("companyName")}
              />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="space-y-1.5 pl-7">
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

          <div className="border-t border-slate-100" />

          {/* Admin section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-slate-600" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Administrador
              </span>
            </div>
            <div className="space-y-1.5 pl-7">
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
            <div className="space-y-1.5 pl-7">
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
            <div className="space-y-1.5 pl-7">
              <Label htmlFor="adminPassword">Contraseña</Label>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={cn("pr-10", errors.adminPassword && "border-destructive")}
                  {...register("adminPassword", {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword.message}</p>}
              {passwordValue.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          bar <= strengthBars ? strengthColor : "bg-slate-200"
                        )}
                      />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p className={cn(
                      "text-xs font-medium",
                      strength <= 1 ? "text-red-500" :
                      strength === 2 ? "text-orange-500" :
                      strength === 3 ? "text-yellow-600" :
                      "text-green-600"
                    )}>
                      {strengthLabel}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1.5 pl-7">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </div>
        </div>

        <div className="auth-footer">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Crear cuenta
              </>
            )}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}
