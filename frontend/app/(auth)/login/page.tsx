"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AuthUser } from "@/lib/types";
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
      const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", values);
      setAuth(res.data!.user, res.data!.token);
      const role = res.data!.user.role;
      if (role === "ADMIN") router.replace("/admin");
      else if (role === "TECHNICIAN") router.replace("/tech");
      else router.replace("/client");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "No se pudo iniciar sesión",
        description: (err as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="px-6 pb-2">
        <h2 className="text-xl font-bold text-slate-900">Bienvenido de vuelta</h2>
        <p className="text-slate-500 text-sm mt-1">Ingresa tus credenciales para continuar</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="auth-body">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              autoComplete="email"
              className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  "pr-10",
                  errors.password && "border-destructive focus-visible:ring-destructive"
                )}
                {...register("password")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </div>

        <div className="auth-footer">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ingresando...
              </>
            ) : (
              "Iniciar sesión"
            )}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Eres una empresa nueva?{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Crea tu cuenta
            </Link>
          </p>
        </div>
      </form>
    </>
  );
}
