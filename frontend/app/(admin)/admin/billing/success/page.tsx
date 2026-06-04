"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSubscription, getCheckoutStatus } from "@/lib/services/billing";
import { Subscription, PlanTier } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<PlanTier, string> = {
  INICIADOR:   "Iniciador",
  PROFESIONAL: "Profesional",
  EMPRESARIAL: "Empresarial",
};

const PLAN_PRICE: Record<PlanTier, string> = {
  INICIADOR:   "$1,799 MXN/mes",
  PROFESIONAL: "$5,299 MXN/mes",
  EMPRESARIAL: "Personalizado",
};


function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(date));
}

function SuccessPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [sub, setSub] = useState<Subscription | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verify() {
      try {
        if (sessionId) {
          const { status } = await getCheckoutStatus(sessionId);
          setVerified(status === "complete");
        }
        const s = await getSubscription();
        setSub(s);
      } catch {
        // fallback — still show success UI
        setVerified(true);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-on-surface-variant">Verificando tu suscripción...</p>
        </div>
      </div>
    );
  }

  const plan = sub?.plan ?? "PROFESIONAL";
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg space-y-8">

        {/* Success icon */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-full bg-tertiary/20 blur-xl scale-150" />
            <div className="relative w-20 h-20 rounded-full bg-tertiary/15 border border-tertiary/30 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-tertiary" />
            </div>
          </div>

          <div>
            <p className="font-label-caps text-tertiary mb-2">Suscripción activada</p>
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">
              ¡Bienvenido al Plan {PLAN_LABEL[plan as PlanTier]}!
            </h1>
            <p className="text-on-surface-variant text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              Tu suscripción está activa. Ahora tienes acceso completo a todas las funciones de tu plan.
            </p>
          </div>
        </div>

        {/* Plan summary card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-on-surface text-lg">Plan {PLAN_LABEL[plan as PlanTier]}</p>
              <p className="text-sm text-on-surface-variant mt-0.5">{PLAN_PRICE[plan as PlanTier]}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-tertiary/15 text-tertiary text-xs font-bold">
              ACTIVO
            </span>
          </div>

          {(sub?.currentPeriodEnd || sub?.trialEndsAt) && (
            <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/20 pt-4">
              {sub.trialEndsAt && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Periodo de prueba hasta</p>
                  <p className="text-sm font-semibold">{formatDate(sub.trialEndsAt)}</p>
                </div>
              )}
              {sub.currentPeriodEnd && (
                <div>
                  <p className="text-xs text-on-surface-variant mb-0.5">Próxima renovación</p>
                  <p className="text-sm font-semibold">{formatDate(sub.currentPeriodEnd)}</p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button asChild className="flex-1 gap-2">
            <Link href="/admin">
              Ir al Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild className="flex-1 gap-2">
            <Link href="/admin/technicians">
              <Users className="h-4 w-4" />
              Agregar técnico
            </Link>
          </Button>
        </div>

        <p className="text-center text-xs text-on-surface-variant">
          ¿Necesitas ayuda?{" "}
          <Link href="/admin/billing" className="text-primary hover:underline">
            Ver detalles de tu suscripción
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessPageInner />
    </Suspense>
  );
}
