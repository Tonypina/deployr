"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check, Minus, ChevronDown, ChevronRight,
  Zap, MapPin, Users, BarChart3, FileText,
  ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type PlanId = "iniciador" | "profesional" | "empresarial";

interface Plan {
  id: PlanId;
  name: string;
  badge?: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  priceLabel?: string;
  description: string;
  ticketLimit: string;
  techLimit: string;
  overage: string | null;
  features: string[];
  cta: string;
  ctaVariant: "primary" | "outline" | "ghost";
  highlighted: boolean;
}

// ── Plan data ──────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "iniciador",
    name: "Iniciador",
    monthlyPrice: 1799,
    annualPrice: 1619,
    description: "Para equipos pequeños que empiezan a profesionalizar su operación.",
    ticketLimit: "250 tickets/mes",
    techLimit: "Hasta 5 técnicos",
    overage: "+$0.70 MXN por ticket adicional",
    features: [
      "Clientes ilimitados",
      "3 plantillas de reporte preestablecidas",
      "Seguimiento de inventario (100 artículos)",
      "Panel del técnico en móvil",
      "Soporte por correo electrónico",
    ],
    cta: "Comenzar prueba gratis",
    ctaVariant: "outline",
    highlighted: false,
  },
  {
    id: "profesional",
    name: "Profesional",
    badge: "MÁS POPULAR",
    monthlyPrice: 5299,
    annualPrice: 4769,
    description: "Para equipos en crecimiento que necesitan automatización y análisis.",
    ticketLimit: "1,500 tickets/mes",
    techLimit: "Hasta 20 técnicos",
    overage: "+$0.35 MXN por ticket adicional",
    features: [
      "Clientes ilimitados",
      "10 plantillas personalizadas (campos ilimitados)",
      "Seguimiento de inventario (1,000 artículos)",
      "Pólizas de mantenimiento programado",
      "Panel analítico avanzado",
      "Acceso a API (1,000 solicitudes/día)",
      "Soporte prioritario + Slack",
      "SSO vía SAML 2.0",
    ],
    cta: "Elegir Profesional",
    ctaVariant: "primary",
    highlighted: true,
  },
  {
    id: "empresarial",
    name: "Empresarial",
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: "Precios personalizados",
    description: "Para operaciones grandes que requieren escala, marca blanca y soporte dedicado.",
    ticketLimit: "Tickets ilimitados",
    techLimit: "Técnicos ilimitados",
    overage: null,
    features: [
      "Plantillas ilimitadas",
      "Inventario ilimitado (10,000+ artículos)",
      "Pólizas con seguimiento de costos",
      "Geolocalización y optimización de rutas",
      "Seguimiento GPS en tiempo real",
      "Portal de marca blanca",
      "Integraciones personalizadas (QuickBooks, SAP...)",
      "Gerente de cuenta dedicado",
      "SLA 99.9% de disponibilidad",
    ],
    cta: "Contactar ventas",
    ctaVariant: "ghost",
    highlighted: false,
  },
];

// ── Overage table ──────────────────────────────────────────────────────────

const OVERAGE_ROWS = [
  { plan: "Iniciador", limit: "250 tickets", rate: "$0.70 MXN", example: "300 tickets = $1,799 + $35 = $1,834 MXN" },
  { plan: "Profesional", limit: "1,500 tickets", rate: "$0.35 MXN", example: "2,000 tickets = $5,299 + $175 = $5,474 MXN" },
  { plan: "Empresarial", limit: "Ilimitados", rate: "—", example: "Sin cargos adicionales" },
];

// ── Add-ons ────────────────────────────────────────────────────────────────

const ADDONS = [
  { icon: MapPin,    title: "GPS y Optimización de Rutas",           price: "$874 MXN/mes",  desc: "Ubicación en tiempo real, rutas automatizadas y check-in con geofence." },
  { icon: Users,     title: "Portal de Cliente (Autoservicio)",       price: "$525 MXN/mes",  desc: "Clientes agendan visitas, reciben notificaciones y descargan historial de servicio." },
  { icon: BarChart3, title: "Reportes Avanzados e Inteligencia BI",   price: "$699 MXN/mes",  desc: "Panel personalizable, ingresos por técnico/cliente, exportación a Tableau/Power BI." },
  { icon: FileText,  title: "Facturación e Invoicing Automatizados",  price: "$874 MXN/mes",  desc: "Genera facturas de tickets completados, facturación recurrente y sincronización contable." },
];

// ── FAQ ────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "¿Qué pasa si excedo mi límite de tickets incluidos?",
    a: "No hay bloqueos. Seguirás creando tickets normalmente y los sobrecostos se calcularán automáticamente. Recibirás alertas al llegar al 80% y al 100% de tu límite mensual.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Los cambios ascendentes tienen efecto inmediato con prorrateo. Los cambios descendentes aplican en el siguiente ciclo de facturación.",
  },
  {
    q: "¿Hay un contrato de permanencia?",
    a: "Iniciador y Profesional son mes a mes, sin contratos. Empresarial tiene un mínimo de 12 meses, negociable.",
  },
  {
    q: "¿Ofrecen descuento por pago anual?",
    a: "Sí, 10% de descuento al pagar anualmente en los planes Iniciador y Profesional.",
  },
  {
    q: "¿Incluye una prueba gratuita?",
    a: "Sí, 14 días gratis sin requerir tarjeta de crédito. Puedes probar todas las funciones del plan que elijas.",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function handleSelectPlan(plan: Plan) {
    if (plan.id === "empresarial") return; // CTA goes nowhere for now
    router.push(`/register?plan=${plan.id}`);
  }

  function displayPrice(plan: Plan) {
    if (plan.priceLabel) return plan.priceLabel;
    const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;
    return `$${price!.toLocaleString("es-MX")} MXN`;
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-40 border-b border-outline-variant/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.png" alt="deployr" width={100} height={36} className="object-contain" priority />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-on-surface-variant hidden sm:block">
              ¿Ya tienes cuenta?
            </span>
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
            >
              Iniciar sesión <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24">

        {/* ── Hero ── */}
        <section className="pt-16 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            14 días gratis · Sin tarjeta de crédito
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-on-surface max-w-3xl mx-auto leading-tight">
            Planes que escalan con<br className="hidden sm:block" /> tu operación
          </h1>
          <p className="mt-4 text-lg text-on-surface-variant max-w-xl mx-auto">
            Desde equipos pequeños hasta flotas nacionales. Elige el plan que mejor se adapta a tu empresa — sin bloqueos, sin sorpresas.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-xl bg-surface-container border border-outline-variant/40">
            <button
              onClick={() => setIsAnnual(false)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200",
                !isAnnual
                  ? "bg-surface-container-highest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Mensual
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2",
                isAnnual
                  ? "bg-surface-container-highest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              )}
            >
              Anual
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-tertiary/15 text-tertiary">
                10% OFF
              </span>
            </button>
          </div>
        </section>

        {/* ── Plan cards ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl p-6 border transition-all duration-300",
                plan.highlighted
                  ? "bg-primary/5 border-primary/40 shadow-[0_0_40px_rgba(173,198,255,0.08)]"
                  : "glass-card"
              )}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase shadow-lg">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan name & description */}
              <div className="mb-6">
                <p className="font-label-caps text-on-surface-variant mb-2">{plan.name.toUpperCase()}</p>
                <div className="mb-1">
                  {plan.priceLabel ? (
                    <p className="text-2xl font-bold text-on-surface">{plan.priceLabel}</p>
                  ) : (
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-bold text-on-surface">{displayPrice(plan)}</span>
                      <span className="text-sm text-on-surface-variant mb-1">/mes</span>
                    </div>
                  )}
                  {isAnnual && plan.monthlyPrice && (
                    <p className="text-xs text-tertiary mt-0.5 font-medium">
                      Facturado anualmente · Ahorras ${Math.round(plan.monthlyPrice * 12 * 0.1).toLocaleString("es-MX")} MXN/año
                    </p>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{plan.description}</p>
              </div>

              {/* Key limits */}
              <div className="flex flex-col gap-2 mb-5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Técnicos</span>
                  <span className="font-semibold text-on-surface">{plan.techLimit.replace("Hasta ", "").replace("Técnicos ilimitados", "Ilimitados")}</span>
                </div>
                <div className="h-px bg-outline-variant/20" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">Tickets incluidos</span>
                  <span className="font-semibold text-on-surface">{plan.ticketLimit.replace("Tickets ilimitados", "Ilimitados")}</span>
                </div>
                {plan.overage && (
                  <>
                    <div className="h-px bg-outline-variant/20" />
                    <p className="text-xs text-on-surface-variant">{plan.overage}</p>
                  </>
                )}
              </div>

              {/* Feature list */}
              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                    <Check className={cn("h-4 w-4 mt-0.5 shrink-0", plan.highlighted ? "text-primary" : "text-tertiary")} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSelectPlan(plan)}
                className={cn(
                  "w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]",
                  plan.ctaVariant === "primary" &&
                    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(173,198,255,0.2)]",
                  plan.ctaVariant === "outline" &&
                    "border border-outline-variant text-on-surface hover:bg-surface-container-high hover:border-primary/40",
                  plan.ctaVariant === "ghost" &&
                    "border border-outline-variant/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                )}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>

        {/* ── Overage model ── */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface">Sin bloqueos. Sin sorpresas.</h2>
            <p className="text-on-surface-variant mt-2 text-sm max-w-lg mx-auto">
              Si superas tu límite mensual, seguirás creando tickets. Los sobrecostos se calculan automáticamente y se incluyen en tu próxima factura.
            </p>
          </div>
          <div className="glass-card overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-3 bg-surface-container-low border-b border-outline-variant/20">
              {["Plan", "Límite incluido", "Tarifa de sobrecosto", "Ejemplo"].map((h) => (
                <p key={h} className="font-label-caps text-on-surface-variant text-[10px]">{h}</p>
              ))}
            </div>
            {OVERAGE_ROWS.map((row, i) => (
              <div
                key={row.plan}
                className={cn(
                  "grid grid-cols-4 px-6 py-4 text-sm gap-2",
                  i < OVERAGE_ROWS.length - 1 && "border-b border-outline-variant/10"
                )}
              >
                <p className="font-semibold text-on-surface">{row.plan}</p>
                <p className="text-on-surface-variant">{row.limit}</p>
                <p className={cn("font-medium", row.rate === "—" ? "text-tertiary" : "text-secondary")}>{row.rate}</p>
                <p className="text-on-surface-variant text-xs">{row.example}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-on-surface-variant mt-3">
            Recibirás notificaciones automáticas al alcanzar el 80% y 100% de tu límite mensual.
          </p>
        </section>

        {/* ── Add-ons ── */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface">Servicios adicionales</h2>
            <p className="text-on-surface-variant mt-2 text-sm">
              Agrega módulos según las necesidades específicas de tu operación.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ADDONS.map(({ icon: Icon, title, price, desc }) => (
              <div key={title} className="glass-card p-5 flex flex-col gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-on-surface">{title}</p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{desc}</p>
                </div>
                <p className="text-sm font-bold text-secondary mt-auto">{price}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-on-surface text-center mb-8">Preguntas frecuentes</h2>
          <div className="flex flex-col divide-y divide-outline-variant/20">
            {FAQS.map((faq, i) => (
              <div key={i} className="py-4">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 text-left group"
                >
                  <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-on-surface-variant shrink-0 transition-transform duration-200",
                      openFaq === i && "rotate-180"
                    )}
                  />
                </button>
                {openFaq === i && (
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="mt-20">
          <div className="glass-card p-10 text-center rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4">
                <Zap className="h-3.5 w-3.5" />
                Comienza hoy
              </div>
              <h2 className="text-3xl font-bold text-on-surface mb-3">
                Listo para optimizar tu operación
              </h2>
              <p className="text-on-surface-variant mb-8 max-w-md mx-auto text-sm">
                14 días de prueba gratis en cualquier plan. Sin tarjeta de crédito. Cancela en cualquier momento.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register?plan=profesional"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(173,198,255,0.2)]"
                >
                  Comenzar prueba gratis <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container transition-all"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
