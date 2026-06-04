"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard, Zap, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, RotateCcw, ExternalLink, Ticket, Users, ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Subscription, PlanTier } from "@/lib/types";
import { getSubscription, createPortalSession } from "@/lib/services/billing";
import { getPlans } from "@/lib/services/plans";
import { BillingPlan, buildPlanByTier, mergePlan } from "@/lib/billing-config";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// ── Config ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; dot: string; badge: string }> = {
  TRIALING:  { label: "PRUEBA ACTIVA",  dot: "bg-secondary animate-ping",    badge: "bg-secondary/15 text-secondary border-secondary/30"     },
  ACTIVE:    { label: "PLAN ACTIVO",    dot: "bg-tertiary animate-ping",      badge: "bg-tertiary/15 text-tertiary border-tertiary/30"         },
  PAST_DUE:  { label: "PAGO VENCIDO",  dot: "bg-destructive",                badge: "bg-destructive/15 text-destructive border-destructive/30" },
  CANCELLED: { label: "CANCELADO",     dot: "bg-on-surface-variant",         badge: "bg-white/5 text-on-surface-variant border-white/10"       },
  PAUSED:    { label: "PAUSADO",       dot: "bg-on-surface-variant",         badge: "bg-white/5 text-on-surface-variant border-white/10"       },
};

function daysRemaining(d: string | null | undefined) {
  if (!d) return null;
  return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "long" }).format(new Date(d));
}

// ── Page ───────────────────────────────────────────────────────────────────

function BillingPageInner() {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [planByTier, setPlanByTier] = useState<Record<PlanTier, BillingPlan> | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    Promise.all([getSubscription(), getPlans()])
      .then(([subData, rawPlans]) => {
        setSub(subData);
        const merged = rawPlans.map(mergePlan);
        setPlans(merged);
        setPlanByTier(buildPlanByTier(rawPlans));
      })
      .catch(() => toast({ variant: "destructive", title: "No se pudo cargar la suscripción" }))
      .finally(() => setLoading(false));
  }, []);

  async function handlePortal() {
    setActing(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!sub || !planByTier) {
    return <p className="text-sm text-destructive p-6">No se encontró información de suscripción.</p>;
  }

  const plan       = planByTier[sub.plan as PlanTier];
  const badge      = STATUS_BADGE[sub.status] ?? STATUS_BADGE.ACTIVE;
  const trialDays  = daysRemaining(sub.trialEndsAt);
  const isTrialing = sub.status === "TRIALING";
  const isActive   = sub.status === "ACTIVE";
  const hasStripe  = !!sub.stripeSubscriptionId;
  const usagePct   = sub.ticketLimit
    ? Math.min(100, Math.round(((sub.currentMonthTickets ?? 0) / sub.ticketLimit) * 100))
    : 0;

  return (
    <div className="page-stack">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={cn(
              "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border",
              badge.badge
            )}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", badge.dot)} />
                <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", badge.dot.replace(" animate-ping", ""))} />
              </span>
              {badge.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Plan <span className={plan.color}>{plan.name}</span>
          </h1>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {isTrialing && !hasStripe && sub.plan !== "EMPRESARIAL" && (
            <Button
              onClick={() => router.push(`/admin/billing/checkout?plan=${sub.plan}&annual=${annual ? "1" : "0"}`)}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Activar plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
          {hasStripe && (
            <Button variant="outline" onClick={handlePortal} disabled={acting} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              {acting ? "Cargando..." : "Gestionar en Stripe"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Trial warning ── */}
      {isTrialing && trialDays !== null && trialDays <= 7 && (
        <div className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm",
          trialDays <= 3
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : "bg-secondary/10 border-secondary/30 text-secondary"
        )}>
          <Clock className="h-4 w-4 shrink-0" />
          {trialDays === 0
            ? "Tu periodo de prueba terminó hoy."
            : `Te quedan ${trialDays} día${trialDays !== 1 ? "s" : ""} de prueba.`}
          {" "}
          <button
            onClick={() => router.push(`/admin/billing/checkout?plan=${sub.plan}&annual=0`)}
            className="font-semibold underline underline-offset-2 hover:opacity-80 ml-1"
          >
            Activar ahora →
          </button>
        </div>
      )}

      {/* ── Past due alert ── */}
      {sub.status === "PAST_DUE" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive text-sm">Pago fallido</p>
            <p className="text-xs text-muted-foreground mt-0.5">Actualiza tu método de pago para reactivar el servicio.</p>
          </div>
          <Button size="sm" variant="outline" onClick={handlePortal} disabled={acting}
            className="shrink-0 border-destructive/40 text-destructive">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Actualizar
          </Button>
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Plan summary card */}
        <div className={cn("glass-card p-6 space-y-5 lg:col-span-2", plan.accentBg)}>
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            <CreditCard className="h-3.5 w-3.5" />
            Resumen de suscripción
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Plan</p>
              <p className={cn("text-lg font-bold", plan.color)}>{plan.name}</p>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant mb-1">Precio</p>
              <p className="text-lg font-bold">{plan.priceLabel ?? `$${plan.monthlyPrice?.toLocaleString("es-MX")} MXN/mes`}</p>
            </div>
            {isTrialing && sub.trialEndsAt && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Prueba hasta</p>
                <p className="text-sm font-semibold">{formatDate(sub.trialEndsAt)}</p>
              </div>
            )}
            {isActive && sub.currentPeriodEnd && (
              <div>
                <p className="text-xs text-on-surface-variant mb-1">Próxima renovación</p>
                <p className="text-sm font-semibold">{formatDate(sub.currentPeriodEnd)}</p>
              </div>
            )}
          </div>

          {/* Annual billing toggle — only when trialing */}
          {isTrialing && !hasStripe && sub.plan !== "EMPRESARIAL" && (
            <div className="flex items-center gap-3 pt-1">
              <p className="text-xs text-on-surface-variant">Facturación:</p>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant/40">
                <button
                  onClick={() => setAnnual(false)}
                  className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all",
                    !annual ? "bg-surface-container-highest text-on-surface" : "text-on-surface-variant")}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={cn("px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5",
                    annual ? "bg-surface-container-highest text-on-surface" : "text-on-surface-variant")}
                >
                  Anual
                  <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-tertiary/20 text-tertiary">10% OFF</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Usage card */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            Limites de Uso
          </div>

          {/* Technicians */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Users className="h-3.5 w-3.5" />
                Técnicos
              </div>
              <span className="font-bold">
                {plan.techMax ?? "∞"}
              </span>
            </div>
          </div>

          {/* Tickets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <Ticket className="h-3.5 w-3.5" />
                Tickets por mes
              </div>
              <span className="font-bold">
                {sub.currentMonthTickets ?? 0}
                <span className="text-on-surface-variant font-normal text-xs">
                  {" "}/ {sub.ticketLimit?.toLocaleString("es-MX") ?? "∞"}
                </span>
              </span>
            </div>
            {sub.ticketLimit && (
              <>
                <div className="h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      usagePct >= 100 ? "bg-destructive" : usagePct >= 80 ? "bg-secondary" : "bg-primary"
                    )}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                {usagePct >= 80 && (
                  <p className="text-[10px] text-secondary leading-snug">
                    {usagePct >= 100
                      ? `+$${sub.overagePriceMxn} MXN por ticket adicional`
                      : `${usagePct}% del límite mensual`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Change plan ── */}
      {sub.plan !== "EMPRESARIAL" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-on-surface-variant uppercase">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Cambiar plan
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => {
              const isCurrent = p.tier === sub.plan;
              const price = annual ? p.annualPrice : p.monthlyPrice;
              const isEnterprise = p.tier === "EMPRESARIAL";

              return (
                <div
                  key={p.id}
                  className={cn(
                    "glass-card p-5 space-y-4 transition-all",
                    p.accentBg,
                    isCurrent && "ring-2 ring-primary/30"
                  )}
                >
                  {/* Header */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-bold", p.color)}>{p.name}</span>
                      {p.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary tracking-wider">
                          {p.badge}
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant tracking-wider ml-auto">
                          ACTUAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{p.description}</p>
                  </div>

                  {/* Price */}
                  <div>
                    {p.priceLabel ? (
                      <p className={cn("text-xl font-bold", p.color)}>{p.priceLabel}</p>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold">
                          ${(price ?? 0).toLocaleString("es-MX")}
                        </span>
                        <span className="text-xs text-on-surface-variant">MXN/mes</span>
                      </div>
                    )}
                    {annual && p.annualPrice && (
                      <p className="text-[10px] text-tertiary mt-0.5">Facturado anualmente</p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="space-y-1.5 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-3 w-3 shrink-0" />
                      {p.ticketLimit}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 shrink-0" />
                      {p.techLimit}
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-1.5">
                    {p.features.slice(0, 4).map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-on-surface-variant">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-tertiary" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <Button variant="outline" disabled className="w-full text-xs">
                      Plan actual
                    </Button>
                  ) : isEnterprise ? (
                    <Button variant="ghost" className="w-full text-xs" asChild>
                      <a href="mailto:soporte@deployr.mx">Contactar ventas</a>
                    </Button>
                  ) : isTrialing && !hasStripe ? (
                    <Button
                      className="w-full text-xs gap-1.5"
                      variant={p.ctaVariant === "primary" ? "default" : "outline"}
                      onClick={() =>
                        router.push(
                          `/admin/billing/checkout?plan=${p.tier}&annual=${annual ? "1" : "0"}`
                        )
                      }
                    >
                      Elegir {p.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  ) : hasStripe ? (
                    <Button
                      variant="outline"
                      className="w-full text-xs gap-1.5"
                      onClick={handlePortal}
                      disabled={acting}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {acting ? "Cargando..." : "Cambiar en Stripe"}
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empresarial note ── */}
      {sub.plan === "EMPRESARIAL" && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-secondary/5 border border-secondary/20">
          <Zap className="h-4 w-4 text-secondary shrink-0" />
          <p className="text-sm text-on-surface-variant">
            Tu facturación es gestionada directamente. Contacta a soporte para realizar cambios en tu plan.
          </p>
        </div>
      )}

      {/* ── Go to checkout CTA (full width, only trialing) ── */}
      {isTrialing && !hasStripe && sub.plan !== "EMPRESARIAL" && (
        <div className="glass-card p-6 flex items-center justify-between gap-6 border border-primary/20">
          <div>
            <p className="font-semibold text-on-surface">Activa tu plan para continuar</p>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Tu tarjeta no será cobrada hasta que termine el periodo de prueba.
            </p>
          </div>
          <Button
            onClick={() => router.push(`/admin/billing/checkout?plan=${sub.plan}&annual=${annual ? "1" : "0"}`)}
            className="gap-2 shrink-0"
          >
            <Zap className="h-4 w-4" />
            Activar plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}
