import { ShieldCheck, Headphones, Code2 } from "lucide-react";
import type { Plan, PlanTier } from "@/lib/types";

export interface PlanUIConfig {
  id: string;
  color: string;
  accentBg: string;
  cta: string;
  ctaVariant: "primary" | "outline" | "ghost";
  ctaHref: string;
  priceDetail: string | null;
  featureBadges: { icon: typeof ShieldCheck; label: string }[];
}

export type BillingPlan = Plan & PlanUIConfig & {
  ticketLimit: string;
  techLimit: string;
  overageLabel: string | null;
};

export const PLAN_UI_CONFIG: Record<PlanTier, PlanUIConfig> = {
  BASICO: {
    id: "basico",
    color: "text-on-surface-variant",
    accentBg: "",
    cta: "Comenzar prueba gratis",
    ctaVariant: "outline",
    ctaHref: "/register?plan=basico",
    priceDetail: null,
    featureBadges: [
      { icon: ShieldCheck, label: "Sin contratos"     },
      { icon: Headphones,  label: "Soporte por email" },
    ],
  },
  INICIADOR: {
    id: "iniciador",
    color: "text-on-surface-variant",
    accentBg: "bg-surface-container-high",
    cta: "Comenzar prueba gratis",
    ctaVariant: "outline",
    ctaHref: "/register?plan=iniciador",
    priceDetail: null,
    featureBadges: [
      { icon: ShieldCheck, label: "Sin contratos"     },
      { icon: Headphones,  label: "Soporte por email" },
      { icon: Code2,       label: "API básica"         },
    ],
  },
  PROFESIONAL: {
    id: "profesional",
    color: "text-primary",
    accentBg: "bg-primary/5",
    cta: "Elegir Profesional",
    ctaVariant: "primary",
    ctaHref: "/register?plan=profesional",
    priceDetail: null,
    featureBadges: [
      { icon: ShieldCheck, label: "Sin contratos"               },
      { icon: Headphones,  label: "Soporte prioritario" },
      { icon: Code2,       label: "Acceso completo a API"       },
    ],
  },
  EMPRESARIAL: {
    id: "empresarial",
    color: "text-secondary",
    accentBg: "bg-secondary/5",
    cta: "Contactar ventas",
    ctaVariant: "ghost",
    ctaHref: "mailto:ventas@deployr.mx",
    priceDetail: "Desde $17,499 MXN/mes · $449 MXN/técnico",
    featureBadges: [
      { icon: ShieldCheck, label: "SLA 99.9%"         },
      { icon: Headphones,  label: "Gerente de cuenta" },
      { icon: Code2,       label: "Marca blanca"       },
    ],
  },
};

export function mergePlan(plan: Plan): BillingPlan {
  const ui = PLAN_UI_CONFIG[plan.tier];
  const techLimit = plan.techMax === 1
    ? "1 técnico"
    : plan.techMax
      ? `Hasta ${plan.techMax} técnicos`
      : "Técnicos ilimitados";

  return {
    ...plan,
    ...ui,
    ticketLimit: plan.ticketMax
      ? `${plan.ticketMax.toLocaleString("es-MX")} tickets/mes`
      : "Tickets ilimitados",
    techLimit,
    overageLabel: plan.overagePriceMxn
      ? `+$${plan.overagePriceMxn} MXN por ticket adicional`
      : null,
  };
}

export function buildPlanByTier(plans: Plan[]): Record<PlanTier, BillingPlan> {
  return Object.fromEntries(
    plans.map((p) => [p.tier, mergePlan(p)])
  ) as Record<PlanTier, BillingPlan>;
}
