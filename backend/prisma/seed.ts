import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PLANS = [
  {
    tier: "BASICO" as const,
    name: "Básico",
    badge: null,
    monthlyPrice: 699,
    annualPrice: 629,
    priceLabel: null,
    description: "Para profesionales independientes",
    ticketMax: 50,
    techMax: 1,
    adminMax: 1,
    clientMax: 3,
    inventoryMax: 10,
    templateMax: 0,
    allowPolicies: true,
    overagePriceMxn: 25,
    highlighted: false,
    sortOrder: 0,
    features: [
      "Un técnico",
      "Hasta 3 clientes",
      "Hasta 50 tickets/mes",
      "Plantilla de reporte predeterminada",
      "Seguimiento de inventario (10 artículos)",
      "Soporte por correo electrónico",
    ],
  },
  {
    tier: "INICIADOR" as const,
    name: "Iniciador",
    badge: null,
    monthlyPrice: 1799,
    annualPrice: 1619,
    priceLabel: null,
    description: "Para equipos pequeños (1–5 técnicos)",
    ticketMax: 150,
    techMax: 5,
    adminMax: 1,
    clientMax: 10,
    inventoryMax: 100,
    templateMax: 3,
    allowPolicies: true,
    overagePriceMxn: 25,
    highlighted: false,
    sortOrder: 1,
    features: [
      "Hasta 5 técnicos activos",
      "Hasta 10 clientes",
      "Hasta 150 tickets/mes",
      "Plantillas de reporte básicas (3 personalizadas)",
      "Seguimiento de inventario (100 artículos)",
      "Técnico adicional: +$499 MXN/mes",
      "Soporte por correo electrónico",
    ],
  },
  {
    tier: "PROFESIONAL" as const,
    name: "Profesional",
    badge: "Más popular",
    monthlyPrice: 5299,
    annualPrice: 4769,
    priceLabel: null,
    description: "Para equipos en crecimiento (6–20 técnicos)",
    ticketMax: 1500,
    techMax: 20,
    adminMax: 5,
    clientMax: 100,
    inventoryMax: 1000,
    templateMax: null,
    allowPolicies: true,
    overagePriceMxn: 15,
    highlighted: true,
    sortOrder: 2,
    features: [
      "Hasta 20 técnicos activos",
      "Hasta 100 clientes",
      "Hasta 1,500 tickets/mes",
      "Plantillas personalizadas ilimitadas",
      "Seguimiento de inventario (1,000 artículos)",
      "Políticas de mantenimiento programado",
      "Panel de control analítico avanzado",
      "Reportes con marca personalizada",
      "Técnico adicional: +$299 MXN/mes",
      "Soporte prioritario por correo electrónico",
    ],
  },
  {
    tier: "EMPRESARIAL" as const,
    name: "Empresarial",
    badge: null,
    monthlyPrice: null,
    annualPrice: null,
    priceLabel: "Precios personalizados",
    description: "Para operaciones grandes (20+ técnicos)",
    ticketMax: null,
    techMax: null,
    adminMax: null,
    clientMax: null,
    inventoryMax: null,
    templateMax: null,
    allowPolicies: true,
    overagePriceMxn: 0,
    highlighted: false,
    sortOrder: 3,
    features: [
      "Técnicos ilimitados",
      "Clientes ilimitados",
      "Tickets de servicio ilimitados",
      "Plantillas de reporte ilimitadas",
      "Seguimiento de inventario ilimitado",
      "Políticas de mantenimiento programado",
      "Geolocalización avanzada y optimización de rutas",
      "Seguimiento de técnicos en tiempo real (GPS)",
      "Portal de marca blanca (remarcación para reventa)",
      "Soporte telefónico 24/7 + gerente de cuenta",
      "Integraciones personalizadas (QuickBooks, SAP, etc.)",
    ],
  },
];

async function main() {
  console.log("Seeding plans...");
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
    console.log(`  ✓ ${plan.name}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
