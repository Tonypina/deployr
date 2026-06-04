import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      tier: "INICIADOR" as const,
      name: "Iniciador",
      badge: null,
      monthlyPrice: 1799,
      annualPrice: 1619,  // 10% off — $1,799 × 0.9
      priceLabel: null,
      description: "Para equipos pequeños que empiezan a profesionalizar su operación.",
      ticketMax: 250,
      techMax: 5,
      overagePriceMxn: 0.70,
      features: [
        "Hasta 5 técnicos incluidos",
        "250 tickets/mes incluidos",
        "Técnico adicional: $299 MXN/mes",
        "Sobrecosto por ticket adicional: $0.70 MXN",
        "Clientes ilimitados",
        "3 plantillas de reporte preestablecidas",
        "Seguimiento de inventario (100 artículos)",
        "Panel del técnico en móvil",
        "Soporte por correo electrónico",
        "Alertas al 80% y 100% del límite mensual",
      ],
      highlighted: false,
      sortOrder: 0,
    },
    {
      tier: "PROFESIONAL" as const,
      name: "Profesional",
      badge: "MÁS POPULAR",
      monthlyPrice: 5299,
      annualPrice: 4769,  // 10% off — $5,299 × 0.9
      priceLabel: null,
      description: "Para equipos en crecimiento que necesitan automatización y análisis.",
      ticketMax: 1500,
      techMax: 20,
      overagePriceMxn: 0.35,
      features: [
        "De 6 a 20 técnicos incluidos",
        "1,500 tickets/mes incluidos",
        "Técnico adicional: $199 MXN/mes",
        "Sobrecosto por ticket adicional: $0.35 MXN",
        "Clientes ilimitados",
        "10 plantillas personalizadas (campos ilimitados)",
        "Seguimiento de inventario (1,000 artículos)",
        "Pólizas de mantenimiento programado",
        "Panel analítico avanzado",
        "Acceso a API (1,000 solicitudes/día)",
        "Soporte prioritario + Slack",
        "SSO vía SAML 2.0",
        "Alertas al 80% y 100% del límite mensual",
      ],
      highlighted: true,
      sortOrder: 1,
    },
    {
      tier: "EMPRESARIAL" as const,
      name: "Empresarial",
      badge: null,
      monthlyPrice: 17499,
      annualPrice: null,   // negotiated annually — 12-month minimum commitment
      priceLabel: "Desde $17,499 MXN/mes",
      description: "Para operaciones con 20+ técnicos y 5,000+ tickets anuales que requieren escala, marca blanca y soporte dedicado.",
      ticketMax: null,
      techMax: null,
      overagePriceMxn: 0,
      features: [
        "Mínimo 25 técnicos incluidos",
        "Tickets ilimitados",
        "Técnicos ilimitados sin costo adicional",
        "Sin sobrecosto por ticket",
        "Plantillas ilimitadas",
        "Inventario ilimitado (10,000+ artículos)",
        "Pólizas con seguimiento de costos",
        "Geolocalización y optimización de rutas",
        "Seguimiento GPS en tiempo real",
        "Portal de marca blanca",
        "Integraciones personalizadas (QuickBooks, SAP...)",
        "Acceso a API ilimitado",
        "Gerente de cuenta dedicado",
        "SLA 99.9% de disponibilidad",
        "Compromiso mínimo de 12 meses",
      ],
      highlighted: false,
      sortOrder: 2,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: plan,
      create: plan,
    });
  }

  console.log("Plans seeded successfully");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
