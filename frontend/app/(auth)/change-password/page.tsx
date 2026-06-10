"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { changePassword } from "@/lib/services/auth";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual"),
    newPassword: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

function rolePath(role: string) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "TECHNICIAN") return "/tech";
  return "/client";
}

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, token, setAuth, isLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      await changePassword(values.currentPassword, values.newPassword);

      // Update auth store so the flag is cleared without requiring a new login
      if (user && token) {
        setAuth({ ...user, mustChangePassword: false }, token);
      }

      toast({ title: "Contraseña actualizada exitosamente" });
      router.replace(rolePath(user!.role));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al cambiar contraseña",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (isLoading || !user) return null;

  return (
    <div className="auth-shell">
      <div className="auth-card w-full max-w-sm">
        <div className="auth-header pb-6">
          <Image src="/logo.png" alt="deployr" width={120} height={48} className="object-contain object-left" priority />
        </div>

      <div className="px-6 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-on-surface">Cambia tu contraseña</h2>
        </div>
        <p className="text-on-surface-variant text-sm">
          Por seguridad debes establecer una contraseña personal antes de continuar.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-body">
          {/* Current password */}
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">Contraseña temporal actual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrent ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn("pr-10", errors.currentPassword && "border-destructive focus-visible:ring-destructive")}
                {...register("currentPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label={showCurrent ? "Ocultar" : "Mostrar"}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-xs text-destructive">{errors.currentPassword.message}</p>}
          </div>

          {/* New password */}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={cn("pr-10", errors.newPassword && "border-destructive focus-visible:ring-destructive")}
                {...register("newPassword")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                aria-label={showNew ? "Ocultar" : "Mostrar"}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.newPassword && <p className="text-xs text-destructive">{errors.newPassword.message}</p>}
          </div>

          {/* Confirm password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className={cn(errors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
        </div>

        <div className="auth-footer">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Establecer nueva contraseña"
            )}
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
