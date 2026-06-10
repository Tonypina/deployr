"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Check, ChevronDown, ChevronRight,
  Zap, MapPin, BarChart3, Building2,
  ArrowRight, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { type BillingPlan, mergePlan } from "@/lib/billing-config";
import { getPlans } from "@/lib/services/plans";

// ── Static content ─────────────────────────────────────────────────────────

const OVERAGE_ROWS = [
  { plan: "Básico", limit: "50 tickets", rate: "$25 MXN", example: "300 tickets = $699 + ($25 × 200) = $5,699 MXN" },
  { plan: "Iniciador", limit: "150 tickets", rate: "$25 MXN", example: "300 tickets = $1,799 + ($25 × 50) = $3,049 MXN" },
  { plan: "Profesional", limit: "1,500 tickets", rate: "$15 MXN", example: "2,000 tickets = $5,299 + ($15 × 500) = $12,799 MXN" },
  { plan: "Empresarial", limit: "Ilimitados", rate: "—", example: "Sin cargos adicionales" },
];

const ADDONS = [
  {
    icon: MapPin,
    title: "GPS y Optimización de Rutas",
    price: "+$1,299 MXN/mes",
    features: [
      "Ubicación del técnico en tiempo real",
      "Planificación de ruta automatizada (reduce tiempo de viaje)",
      "Check-in con geolocalización (marcas de entrada/salida)",
    ],
  },
  {
    icon: BarChart3,
    title: "Reportes Avanzados e Inteligencia Empresarial",
    price: "+$2,499 MXN/mes",
    features: [
      "Constructor de panel personalizado",
      "Generación de reportes con Inteligencia Artificial",
      "Reportería a partir de un prompt",
    ],
  },
];

const VOLUME_DISCOUNTS = [
  { threshold: "10+ licencias de empresa", discount: "15% de descuento" },
  { threshold: "50+ licencias de empresa", discount: "25% de descuento" },
  { threshold: "100+ licencias de empresa", discount: "Contactar a ventas" },
];

const FAQS = [
  {
    q: "¿Qué pasa si excedo mi límite de tickets incluidos?",
    a: "No hay bloqueos. Seguirás creando tickets normalmente y los sobrecostos se calcularán automáticamente. Recibirás alertas al llegar al 80% y al 100% de tu límite mensual. El cargo se incluye en tu siguiente factura.",
  },
  {
    q: "¿Puedo cambiar de plan en cualquier momento?",
    a: "Sí. Los cambios tienen efecto con prorrateo en el siguiente ciclo de facturación.",
  },
  {
    q: "¿Hay contratos de permanencia?",
    a: "Básico, Iniciador y Profesional son mes a mes, sin contratos de bloqueo. Empresarial tiene un mínimo de 12 meses, negociable.",
  },
  {
    q: "¿Ofrecen descuento por pago anual?",
    a: "Sí, 10% de descuento al pagar anualmente en los planes Básico, Iniciador y Profesional.",
  },
  {
    q: "¿Incluye una prueba gratuita?",
    a: "Sí, 14 días gratis sin requerir tarjeta de crédito. Puedes probar todas las funciones del plan que elijas.",
  },
  {
    q: "¿Cuáles son los métodos de pago aceptados?",
    a: "Aceptamos tarjeta de crédito, transferencia bancaria y SPEI.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlans()
      .then((raw) => setPlans(raw.map(mergePlan)))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  function displayPrice(plan: BillingPlan) {
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
            <span className="text-sm text-on-surface-variant hidden sm:block">¿Ya tienes cuenta?</span>
            <Link href="/login" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              Iniciar sesión <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-24">

        {/* ── Hero ── */}
        <section className="pt-16 pb-12 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2 }}
          >

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-on-surface max-w-3xl mx-auto leading-tight mb-4">
              {["Planes", "que", "escalan", "con", "tu", "operación"].map((word, wi) => (
                <span key={wi} className="inline-block mr-3 last:mr-0">
                  {word.split("").map((letter, li) => (
                    <motion.span
                      key={`${wi}-${li}`}
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: wi * 0.08 + li * 0.025,
                        type: "spring",
                        stiffness: 150,
                        damping: 25,
                      }}
                      className="inline-block"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-lg text-on-surface-variant max-w-xl mx-auto"
            >
              Desde técnicos independientes hasta flotas nacionales. Sin bloqueos, sin sorpresas. Los precios incluyen IVA.
            </motion.p>

            {/* Billing toggle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-8 inline-flex items-center gap-3 p-1 rounded-xl bg-surface-container border border-outline-variant/40"
            >
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
            </motion.div>
          </motion.div>
        </section>
        
        {/* ── Plan cards ── */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-6 animate-pulse space-y-4">
                <div className="h-3 bg-surface-container-highest rounded w-1/3" />
                <div className="h-8 bg-surface-container-highest rounded w-1/2" />
                <div className="h-3 bg-surface-container-highest rounded w-full" />
                <div className="h-3 bg-surface-container-highest rounded w-4/5" />
              </div>
            ))
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl p-6 border transition-all duration-300",
                  plan.highlighted
                    ? "bg-primary/5 border-primary/40 shadow-[0_0_40px_rgba(173,198,255,0.08)]"
                    : "glass-card"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase shadow-lg">
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-5">
                  <p className="font-label-caps text-on-surface-variant mb-1">{plan.name.toUpperCase()}</p>
                  <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">{plan.description}</p>

                  {plan.priceLabel ? (
                    <div>
                      <p className={cn("text-xl font-bold", plan.color)}>{plan.priceLabel}</p>
                      {plan.priceDetail && (
                        <p className="text-xs text-on-surface-variant mt-1">{plan.priceDetail}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-end gap-1">
                        <span className={cn("text-3xl font-bold", plan.color)}>{displayPrice(plan)}</span>
                        <span className="text-sm text-on-surface-variant mb-1">/mes</span>
                      </div>
                      {isAnnual && plan.monthlyPrice && (
                        <p className="text-xs text-tertiary mt-0.5 font-medium">
                          Facturado anualmente · Ahorras ${Math.round(plan.monthlyPrice * 12 * 0.1).toLocaleString("es-MX")} MXN/año
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="flex flex-col gap-2 mb-5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Técnicos</span>
                    <span className="font-semibold">{plan.techLimit.replace("Hasta ", "").replace("Técnicos ilimitados", "Ilimitados")}</span>
                  </div>
                  <div className="h-px bg-outline-variant/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Tickets/mes</span>
                    <span className="font-semibold">{plan.ticketLimit.replace("Tickets ilimitados", "Ilimitados")}</span>
                  </div>
                  {plan.overageLabel && (
                    <>
                      <div className="h-px bg-outline-variant/20" />
                      <p className="text-xs text-on-surface-variant">{plan.overageLabel}</p>
                    </>
                  )}
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-on-surface-variant">
                      <Check className={cn("h-4 w-4 mt-0.5 shrink-0", plan.highlighted ? "text-primary" : "text-tertiary")} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={plan.ctaHref}
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
                </Link>
              </div>
            ))
          )}
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
              {["Plan", "Límite incluido", "Sobrecosto", "Ejemplo"].map((h) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {ADDONS.map(({ icon: Icon, title, price, features }) => (
              <div key={title} className="glass-card p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-on-surface leading-snug">{title}</p>
                    <p className="text-base font-bold text-secondary mt-1">{price}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-on-surface-variant">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-tertiary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* ── Volume discounts ── */}
        <section className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface">Descuentos por volumen</h2>
            <p className="text-on-surface-variant mt-2 text-sm">
              Para empresas que gestionan múltiples licencias.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {VOLUME_DISCOUNTS.map(({ threshold, discount }) => (
              <div key={threshold} className="glass-card p-5 text-center space-y-1">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 mx-auto mb-3">
                  <Building2 className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-xs text-on-surface-variant">{threshold}</p>
                <p className="text-base font-bold text-secondary">{discount}</p>
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
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed pr-8">{faq.a}</p>
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
