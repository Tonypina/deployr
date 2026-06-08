"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Building2,
  CalendarX2,
  Check,
  CheckCircle2,
  EyeOff,
  Globe,
  Instagram,
  Phone,
  PlayCircle,
  Share2,
  Shield,
  Ticket,
  Wrench,
} from "lucide-react";

const PRICES = {
  basic:   { monthly: 699,  annual: 629  },
  starter: { monthly: 1799, annual: 1619 },
  pro:     { monthly: 5299, annual: 4769 },
};

const PROBLEM_ITEMS = [
  { icon: <AlertCircle className="w-4 h-4 text-destructive" />, text: "Tickets perdidos en WhatsApp" },
  { icon: <Phone className="w-4 h-4 text-destructive" />,       text: "Clientes llamando por actualizaciones" },
  { icon: <CalendarX2 className="w-4 h-4 text-destructive" />,  text: "Mantenimiento preventivo olvidado" },
  { icon: <EyeOff className="w-4 h-4 text-destructive" />,      text: "Sin visibilidad del trabajo de los técnicos" },
];

const FEATURES = [
  {
    icon: <Ticket className="w-6 h-6" />,
    iconClass: "text-primary bg-primary/10",
    checkClass: "text-primary",
    title: "Tickets de Servicio",
    desc: "Domina el ciclo de vida del ticket desde la solicitud inicial hasta el cierre final con seguimiento automatizado.",
    items: ["Transiciones de estado automatizadas", "Adjuntos de fotos y videos", "Escalación inteligente de prioridad"],
    delay: "0s",
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    iconClass: "text-amber-accent bg-amber-accent/10",
    checkClass: "text-amber-accent",
    title: "Gestión de Técnicos",
    desc: "Potencia a tus técnicos con herramientas móviles especializadas y actualizaciones de despacho en tiempo real.",
    items: ["App enfocada para técnicos", "Seguimiento de ubicación GPS", "Funcionamiento sin conexión"],
    delay: "0.1s",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    iconClass: "text-tertiary bg-tertiary/10",
    checkClass: "text-tertiary",
    title: "Portal de Clientes",
    desc: "Reduce la carga administrativa con portales de autoservicio con marca blanca para tus clientes.",
    items: ["Historial y estado de tickets", "Reserva directa de citas", "Descarga de reportes (PDF)"],
    delay: "0.2s",
  },
];

const STEPS = [
  { n: 1, title: "Crear Ticket",       desc: "Registra solicitudes manualmente o deja que los clientes usen el portal para activar nuevas tareas de mantenimiento.", border: "border-primary",  text: "text-primary"  },
  { n: 2, title: "Asignar Técnico",    desc: "Los filtros de despacho inteligente te muestran al técnico más cercano y calificado para el trabajo.",                border: "border-primary",  text: "text-primary"  },
  { n: 3, title: "Completar Reporte",  desc: "Los técnicos terminan el trabajo y generan reportes estructurados con fotos al instante.",                            border: "border-tertiary", text: "text-tertiary" },
];

const STATS = [
  { val: "40%",  label: "menos tickets perdidos",    accent: "" },
  { val: "100%", label: "cumplimiento de reportes",  accent: "text-tertiary" },
  { val: "3x",   label: "despacho más rápido",       accent: "" },
];

const FOOTER_COLS = [
  { title: "Plataforma", links: [{ label: "Guia de usuario", href: "#" }] },
  { title: "Empresa",    links: [{ label: "Contactar Ventas", href: "#" }] },
  { title: "Legal",      links: [{ label: "Política de Privacidad", href: "/privacy" }, { label: "Términos de Servicio", href: "/terms" }] },
];

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;
    if (user.role === "ADMIN") router.replace("/admin");
    else if (user.role === "TECHNICIAN") router.replace("/tech");
    else router.replace("/client");
  }, [user, isLoading, router]);

  // Neural flow canvas background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0, raf = 0, scrollY = 0;
    const COLORS = ["rgba(173,198,255,0.15)", "rgba(60,227,106,0.1)"];

    class Line {
      x = 0; y = 0; len = 0; spd = 0; col = ""; amp = 0; freq = 0; off = 0; thick = 0;
      constructor() { this.reset(true); }
      reset(init = false) {
        this.x = Math.random() * w;
        this.y = init ? Math.random() * h : h + 500;
        this.len = Math.random() * 300 + 200;
        this.spd = Math.random() * 0.5 + 0.2;
        this.col = COLORS[Math.floor(Math.random() * 2)];
        this.amp = Math.random() * 50 + 20;
        this.freq = Math.random() * 0.005 + 0.002;
        this.off = Math.random() * 1000;
        this.thick = Math.random() * 2 + 1;
      }
      draw() {
        ctx.beginPath();
        ctx.strokeStyle = this.col;
        ctx.lineWidth = this.thick;
        ctx.lineCap = "round";
        this.y -= this.spd + scrollY * 0.0002;
        if (this.y < -this.len) this.reset();
        for (let i = 0; i < this.len; i += 5) {
          const px = this.x + Math.sin((this.y + i + this.off) * this.freq) * this.amp;
          i === 0 ? ctx.moveTo(px, this.y + i) : ctx.lineTo(px, this.y + i);
        }
        ctx.stroke();
      }
    }

    const resize = () => { w = canvas.width = innerWidth; h = canvas.height = innerHeight; };
    window.addEventListener("resize", resize);
    resize();

    const lines = Array.from({ length: 15 }, () => new Line());
    const onScroll = () => { scrollY = window.pageYOffset; };
    window.addEventListener("scroll", onScroll);

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w);
      g.addColorStop(0, "#131313");
      g.addColorStop(1, "#0d0e11");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      lines.forEach(l => l.draw());
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Scroll-reveal via IntersectionObserver
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("active"); obs.unobserve(e.target); }
      }),
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );
    document.querySelectorAll(".reveal").forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fmt = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const price = (k: keyof typeof PRICES) => fmt(PRICES[k][isAnnual ? "annual" : "monthly"]);

  return (
    <div className="text-on-surface overflow-x-hidden min-h-screen">
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none -z-10 opacity-60"
      />

      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#1e1e1e]/70 backdrop-blur-xl border-b border-white/10 shadow-md inner-glow h-20">
        <div className="flex justify-between items-center px-container-padding max-w-7xl mx-auto h-full">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="deployr" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features"     className="text-sm text-primary font-bold border-b-2 border-primary pb-1 transition-transform active:scale-95">Características</a>
            <a href="#how-it-works" className="text-sm text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">Cómo Funciona</a>
            <a href="#pricing"      className="text-sm text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">Precios</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login"    className="text-on-surface font-medium px-4 py-2 hover:opacity-80 transition-all active:scale-95">Iniciar Sesión</Link>
            <Link href="/register" className="bg-primary text-primary-foreground font-bold px-6 py-2 rounded shadow-md hover:opacity-90 transition-all active:scale-95">Comenzar</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        className="relative pt-40 pb-24 overflow-hidden"
        style={{ background: "radial-gradient(circle at top right, rgba(173,198,255,0.05) 0%, transparent 60%)" }}
      >
        <div className="max-w-7xl mx-auto px-container-padding grid lg:grid-cols-2 gap-12 items-center">
          <div className="z-10 reveal active">
            <span className="font-label-caps text-amber-accent block mb-4 tracking-[0.2em]">
              Operaciones de Campo Redefinidas
            </span>
            <h1 className="font-display text-6xl md:text-7xl font-bold leading-tight mb-6 text-on-surface">
              Despacho. <span className="text-primary">Hecho Mejor.</span>
            </h1>
            <p className="text-on-surface-variant text-lg md:text-xl mb-10 max-w-lg">
              La plataforma de operaciones para equipos de mantenimiento en campo. Centraliza la programación, el despacho y los reportes en un solo lugar.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="bg-primary text-primary-foreground font-bold px-8 py-4 rounded-lg text-lg shadow-xl hover:opacity-90 active:scale-95 transition-all">
                Comenzar prueba gratuita
              </Link>
              <button className="glass-card text-on-surface font-semibold px-8 py-4 rounded-lg text-lg hover:bg-white/5 active:scale-95 transition-all flex items-center gap-2">
                <PlayCircle className="w-5 h-5" /> Ver cómo funciona
              </button>
            </div>
          </div>

          <div className="relative group reveal active">
            <div className="absolute -inset-4 bg-primary/20 blur-[100px] opacity-20 rounded-full" />
            <div className="glass-card p-4 rounded-2xl relative overflow-hidden shadow-2xl transform lg:rotate-2 group-hover:rotate-0 transition-transform duration-700">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <div className="w-3 h-3 rounded-full bg-amber-accent" />
                <div className="w-3 h-3 rounded-full bg-tertiary" />
                <div className="ml-auto flex items-center gap-3">
                  <span className="font-mono text-xs text-[#8e909a]">v2.4.1</span>
                  <Image src="/icon.png" alt="icon" width={24} height={24} className="w-6 h-6" />
                </div>
              </div>
              <div className="rounded-lg border border-outline-variant/30 flex items-center justify-center bg-surface-container">
                <Image src="/dash.png" alt="deployr" width={600} height={80} className="rounded-md" />
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 glass-card p-4 rounded-xl shadow-2xl hidden md:block animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-tertiary/20 flex items-center justify-center text-tertiary">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-label-caps text-[#8e909a]">TICKET RESUELTO</p>
                  <p className="font-mono text-sm text-on-surface">ID: #MNT-90210</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Problem Bar ── */}
      <section className="bg-surface-container/60 backdrop-blur-md border-y border-outline-variant/30 reveal">
        <div className="max-w-7xl mx-auto px-container-padding py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4 text-center">
            {PROBLEM_ITEMS.map((item, i) => (
              <Fragment key={item.text}>
                {i > 0 && <div className="hidden md:block w-px h-6 bg-outline-variant" />}
                <span className="text-on-surface-variant font-mono text-sm flex items-center gap-3">
                  {item.icon} {item.text}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Core Features ── */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-container-padding scroll-mt-20">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-4xl font-semibold mb-4">Domina Tus Operaciones</h2>
          <div className="w-24 h-1 bg-primary mx-auto" />
        </div>
        <div className="grid md:grid-cols-3 gap-gutter">
          {FEATURES.map(card => (
            <div
              key={card.title}
              className="glass-card p-8 rounded-2xl inner-glow reveal"
              style={{ transitionDelay: card.delay }}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-6 ${card.iconClass}`}>
                {card.icon}
              </div>
              <h3 className="font-display text-2xl font-semibold mb-4 text-on-surface">{card.title}</h3>
              <p className="text-on-surface-variant mb-6">{card.desc}</p>
              <ul className="space-y-3 text-on-surface-variant">
                {card.items.map(item => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${card.checkClass}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 bg-surface-container-lowest/40 backdrop-blur-sm scroll-mt-20">
        <div className="max-w-7xl mx-auto px-container-padding">
          <div className="text-center mb-20 reveal">
            <h2 className="font-display text-4xl font-semibold mb-4">Flujo de Trabajo Optimizado</h2>
            <p className="text-on-surface-variant">Del caos a la claridad en tres simples pasos.</p>
          </div>
          <div className="relative reveal">
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-outline-variant" />
            <div className="grid md:grid-cols-3 gap-12 relative">
              {STEPS.map(step => (
                <div key={step.n} className="text-center group">
                  <div className={`w-20 h-20 rounded-full bg-surface-container-high border-2 ${step.border} flex items-center justify-center ${step.text} text-3xl font-bold mx-auto mb-8 relative z-10 inner-glow group-hover:scale-110 transition-transform`}>
                    {step.n}
                  </div>
                  <h4 className="font-display text-xl font-semibold mb-3">{step.title}</h4>
                  <p className="text-on-surface-variant text-sm">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 max-w-7xl mx-auto px-container-padding scroll-mt-20">
        <div className="text-center mb-16 reveal">
          <h2 className="font-display text-4xl font-semibold mb-8">Precios Transparentes</h2>
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className={cn("font-medium", !isAnnual ? "text-on-surface" : "text-on-surface-variant")}>
              Mensual
            </span>
            <button
              onClick={() => setIsAnnual(v => !v)}
              className={cn("w-14 h-7 rounded-full relative transition-colors focus:outline-none", isAnnual ? "bg-primary" : "bg-surface-container-highest")}
              aria-label="Alternar período de facturación"
            >
              <span className={cn("absolute top-0.5 left-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200", isAnnual ? "translate-x-6" : "translate-x-0")} />
            </button>
            <span className={cn("font-medium flex items-center gap-2", isAnnual ? "text-on-surface" : "text-on-surface-variant")}>
              Anual <span className="bg-tertiary/20 text-tertiary text-xs px-2 py-1 rounded">-10%</span>
            </span>
          </div>
          {isAnnual && (
            <p className="text-on-surface-variant text-sm">Paga anualmente y ahorra un 10% en tu plan base.</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-stretch mb-12">
          {/* Básico */}
          <div className="glass-card p-8 rounded-2xl flex flex-col reveal">
            <h3 className="font-display text-2xl font-semibold mb-2">Básico</h3>
            <p className="text-on-surface-variant text-sm mb-6">Para profesionales independientes.</p>
            <div className="mb-8">
              <span className="font-display text-4xl font-bold">{price("basic")}</span>
              <span className="text-on-surface-variant text-sm"> MXN/mes</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {["1 Técnico activo", "Hasta 100 tickets/mes", "Soporte por email"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=basico" className="w-full py-3 rounded-lg border border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 text-center block">
              Elegir Plan
            </Link>
          </div>

          {/* Iniciador — featured */}
          <div className="glass-card p-8 rounded-2xl flex flex-col relative border-2 border-tertiary scale-105 shadow-2xl z-10 reveal">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tertiary text-on-tertiary font-bold text-xs px-4 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
              Más Popular
            </div>
            <h3 className="font-display text-2xl font-semibold mb-2">Iniciador</h3>
            <p className="text-on-surface-variant text-sm mb-6">Para equipos pequeños (1–5 técnicos).</p>
            <div className="mb-8">
              <span className="font-display text-5xl font-bold text-tertiary">{price("starter")}</span>
              <span className="text-on-surface-variant text-sm"> MXN/mes</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {["Hasta 5 técnicos", "Hasta 250 tickets/mes", "Plantillas básicas (3)", "Soporte por email"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-on-surface">
                  <Check className="w-5 h-5 text-tertiary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=iniciador" className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-bold shadow-lg hover:opacity-90 transition-all active:scale-95 text-center block">
              Comenzar Prueba Gratuita de 14 Días
            </Link>
          </div>

          {/* Profesional */}
          <div className="glass-card p-8 rounded-2xl flex flex-col reveal">
            <h3 className="font-display text-2xl font-semibold mb-2">Profesional</h3>
            <p className="text-on-surface-variant text-sm mb-6">Para equipos en crecimiento.</p>
            <div className="mb-8">
              <span className="font-display text-4xl font-bold">{price("pro")}</span>
              <span className="text-on-surface-variant text-sm"> MXN/mes</span>
            </div>
            <ul className="space-y-4 mb-10 flex-grow">
              {["Hasta 20 técnicos", "Hasta 1,500 tickets/mes", "Plantillas personalizadas", "Soporte prioritario"].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Check className="w-5 h-5 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register?plan=profesional" className="w-full py-3 rounded-lg border border-primary text-primary font-bold hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 text-center block">
              Elegir Plan
            </Link>
          </div>
        </div>

        {/* Empresarial */}
        <div className="reveal">
          <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-dashed border-outline-variant">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-display text-xl font-semibold">Empresarial</h4>
                <p className="text-on-surface-variant text-sm">Para operaciones nacionales con 20+ técnicos y necesidades de integración.</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-on-surface font-bold text-lg mb-2">Precios Personalizados</p>
              <Link href="/register?plan=empresarial" className="bg-surface-container-high text-on-surface px-6 py-2 rounded-lg border border-outline-variant hover:bg-surface-bright transition-colors inline-block">
                Contactar a Ventas
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-24 bg-primary text-primary-foreground reveal relative">
        <div className="max-w-7xl mx-auto px-container-padding grid md:grid-cols-3 gap-12 text-center relative z-10">
          {STATS.map(s => (
            <div key={s.label}>
              <p className={`font-display text-7xl font-bold leading-none mb-2 ${s.accent}`}>{s.val}</p>
              <p className="font-label-caps opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 relative overflow-hidden reveal">
        <div className="absolute inset-0 bg-primary/5 -z-10" />
        <div className="max-w-4xl mx-auto px-container-padding text-center">
          <h2 className="font-display text-5xl font-bold mb-6">¿Listo para gestionar una operación más eficiente?</h2>
          <p className="text-on-surface-variant text-xl mb-12">
            Únete a más de 500 equipos de mantenimiento en campo que confían en deployr para su despacho diario.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-primary text-primary-foreground font-bold px-10 py-5 rounded-xl text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all">
              Comenzar tu prueba gratuita
            </Link>
            <button className="glass-card text-on-surface font-semibold px-10 py-5 rounded-xl text-xl hover:bg-white/5 active:scale-95 transition-all">
              Reservar una demo
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#0d0e11]/80 backdrop-blur-md w-full py-section-gap border-t border-outline-variant">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-gutter px-container-padding max-w-7xl mx-auto">
          <div className="col-span-2">
            <Image src="/logo.png" alt="deployr" width={120} height={32} className="h-8 mb-6" />
            <p className="text-on-surface-variant text-sm max-w-xs mb-6">
              La plataforma moderna para operaciones en campo. Ayudando a los equipos de mantenimiento a entregar excelencia cada día.
            </p>
          </div>
          {FOOTER_COLS.map(col => (
            <div key={col.title}>
              <h6 className="font-label-caps text-on-surface mb-6">{col.title}</h6>
              <ul className="space-y-4 text-sm">
                {col.links.map(l => (
                  <li key={l.label}><Link href={l.href} className="text-on-surface-variant hover:text-primary transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h6 className="font-label-caps text-on-surface mb-6">Conectar</h6>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/deploy.r/" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:text-primary transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://deployr.mx" className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:text-primary transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-container-padding mt-20 pt-8 border-t border-outline-variant/30 text-center md:text-left">
          <p className="text-on-surface-variant text-sm font-mono">© 2026 Deployr. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
