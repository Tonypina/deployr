"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { ChevronLeft, Check, ShieldCheck, Zap, Users, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession } from "@/lib/services/billing";
import { getPlans } from "@/lib/services/plans";
import { buildPlanByTier, BillingPlan } from "@/lib/billing-config";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PlanKey = "INICIADOR" | "PROFESIONAL";

function CheckoutPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planKey = (searchParams.get("plan") ?? "INICIADOR") as PlanKey;
  const annual = searchParams.get("annual") === "1";

  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    getPlans()
      .then((raw) => {
        const byTier = buildPlanByTier(raw);
        setPlan(byTier[planKey] ?? byTier["INICIADOR"]);
      })
      .catch(() => toast({ variant: "destructive", title: "Error al cargar el plan" }))
      .finally(() => setLoadingPlan(false));
  }, [planKey]);

  const fetchClientSecret = useCallback(async () => {
    try {
      const { clientSecret } = await createCheckoutSession(planKey, annual);
      return clientSecret;
    } catch (e) {
      toast({ variant: "destructive", title: "Error al iniciar checkout", description: (e as Error).message });
      return "";
    }
  }, [planKey, annual]);

  if (loadingPlan || !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  const price = annual ? plan.annualPrice! : plan.monthlyPrice!;
  const annualTotal = plan.annualPrice! * 12;

  return (
    <div className=" h-full flex flex-col overflow-hidden bg-background">

      {/* ── Header — never moves ── */}
      <div className="shrink-0 border-b border-outline-variant/20 px-6 py-4 bg-background/80 backdrop-blur-xl z-10">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5 text-on-surface-variant">
          <ChevronLeft className="h-4 w-4" />
          Volver a suscripción
        </Button>
      </div>

      {/* ── Body — fills remaining height, no outer scroll ── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* ── Left: Order summary — never moves ── */}
          <div className="py-10 space-y-6 overflow-hidden scrollbar-hide">
            <div>
              <p className="font-label-caps text-on-surface-variant mb-1">Resumen de tu pedido</p>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-on-surface">
                  Plan {plan.name}
                </h1>
                {plan.badge && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-bold">
                    {plan.badge}
                  </span>
                )}
              </div>
            </div>

            {/* Price breakdown */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className={cn("text-3xl font-bold", plan.color)}>
                    ${price.toLocaleString("es-MX")} MXN
                  </p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {annual ? "por mes, facturado anualmente" : "por mes"}
                  </p>
                </div>
                <span className={cn(
                  "text-xs px-2 py-1 rounded-full font-semibold",
                  annual ? "bg-tertiary/15 text-tertiary" : "bg-surface-container-high text-on-surface-variant"
                )}>
                  {annual ? "Anual · 10% OFF" : "Mensual"}
                </span>
              </div>

              {annual && (
                <div className="border-t border-outline-variant/20 pt-3 flex justify-between text-sm">
                  <span className="text-on-surface-variant">Total anual</span>
                  <span className="font-semibold text-tertiary">
                    ${annualTotal.toLocaleString("es-MX")} MXN
                  </span>
                </div>
              )}

              <div className="border-t border-outline-variant/20 pt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {plan.techLimit}
                </div>
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <Ticket className="h-3.5 w-3.5 shrink-0" />
                  {plan.ticketLimit}
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-on-surface">Incluye</p>
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tertiary/15">
                      <Check className="h-2.5 w-2.5 text-tertiary" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Trial note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/15">
              <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-on-surface-variant leading-relaxed">
                <span className="font-semibold text-on-surface">14 días gratis.</span>{" "}
                Tu tarjeta no será cobrada hasta que finalice el periodo de prueba. Cancela en cualquier momento.
              </p>
            </div>

            {/* Security badge */}
            <div className="flex items-center gap-2 text-xs text-on-surface-variant pb-2">
              <ShieldCheck className="h-4 w-4 text-tertiary shrink-0" />
              Pago seguro
            </div>
          </div>

          {/* ── Right: Stripe widget — the only thing that scrolls ── */}
          <div className="overflow-y-auto py-10">
            <div className="rounded-2xl overflow-hidden border border-outline-variant/30 bg-surface-container-low">
              <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageInner />
    </Suspense>
  );
}
