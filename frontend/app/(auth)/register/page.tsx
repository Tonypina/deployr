"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { AuthUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  companyName: z.string().min(2, "Mínimo 2 caracteres"),
  companyEmail: z.string().email("Email inválido"),
  adminName: z.string().min(2, "Mínimo 2 caracteres"),
  adminEmail: z.string().email("Email inválido"),
  adminPassword: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/register", values);
      setAuth(res.data!.user, res.data!.token);
      router.replace("/admin");
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Registrar empresa</CardTitle>
          <CardDescription>Crea tu cuenta para comenzar a gestionar tus servicios</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Empresa</p>
            <div className="grid gap-2">
              <Label htmlFor="companyName">Nombre de la empresa</Label>
              <Input id="companyName" placeholder="Servicios XYZ S.A." {...register("companyName")} />
              {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="companyEmail">Email corporativo</Label>
              <Input id="companyEmail" type="email" placeholder="contacto@empresa.com" {...register("companyEmail")} />
              {errors.companyEmail && <p className="text-xs text-destructive">{errors.companyEmail.message}</p>}
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mt-2">Administrador</p>
            <div className="grid gap-2">
              <Label htmlFor="adminName">Nombre completo</Label>
              <Input id="adminName" placeholder="Juan Pérez" {...register("adminName")} />
              {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adminEmail">Email del administrador</Label>
              <Input id="adminEmail" type="email" placeholder="admin@empresa.com" {...register("adminEmail")} />
              {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="adminPassword">Contraseña</Label>
              <Input id="adminPassword" type="password" {...register("adminPassword")} />
              {errors.adminPassword && <p className="text-xs text-destructive">{errors.adminPassword.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">Inicia sesión</Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
