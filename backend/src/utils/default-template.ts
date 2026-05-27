import { prisma } from "../lib/prisma";

export async function getOrCreateDefaultTemplate(companyId: string) {
  const existing = await prisma.reportTemplate.findFirst({
    where: { companyId, isDefault: true },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;

  return prisma.reportTemplate.create({
    data: {
      name: "Plantilla estándar",
      isDefault: true,
      companyId,
      fields: {
        create: [
          { label: "Hallazgos", type: "TEXTAREA", required: true, order: 1 },
          { label: "Acciones realizadas", type: "TEXTAREA", required: true, order: 2 },
          { label: "Partes/refacciones utilizadas", type: "TEXT", required: false, order: 3 },
          { label: "Próxima visita recomendada", type: "DATE", required: false, order: 4 },
        ],
      },
    },
    include: { fields: { orderBy: { order: "asc" } } },
  });
}

export async function getEffectiveTemplate(ticketId: string, companyId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      client: {
        include: {
          template: { include: { fields: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  if (ticket?.client?.template) return ticket.client.template;
  return getOrCreateDefaultTemplate(companyId);
}
