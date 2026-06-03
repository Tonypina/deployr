import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Role } from "@prisma/client";
import { getEffectiveTemplate } from "../utils/default-template";

const router = Router({ mergeParams: true }); // /api/tickets/:ticketId/report

const sparePartSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.number().int().min(1),
});

const reportSchema = z.object({
  // Trim each response value; avoid stripping HTML since PHOTO fields store URLs/base64
  responses:          z.record(z.string()).transform(r =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.trim()]))
  ),
  techSignature:      z.string().optional(),
  clientSignature:    z.string().optional(),
  requiresSpareParts: z.boolean().default(false),
  spareParts:         z.array(sparePartSchema).optional(),
});

async function getTicketForUser(ticketId: string, user: AuthRequest["user"]) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new Error("NOT_FOUND");
  if (user!.role === Role.ADMIN && ticket.companyId !== user!.companyId) throw new Error("FORBIDDEN");
  if (user!.role === Role.TECHNICIAN && ticket.technicianId !== user!.userId) throw new Error("FORBIDDEN");
  if (user!.role === Role.CLIENT_USER && ticket.clientId !== user!.clientId) throw new Error("FORBIDDEN");
  return ticket;
}

router.use(authenticate);

// GET /api/tickets/:ticketId/report
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await getTicketForUser(req.params.ticketId, req.user);
    const report = await prisma.ticketReport.findUnique({
      where: { ticketId: req.params.ticketId },
      include: {
        template: { include: { fields: { orderBy: { order: "asc" } } } },
        spareParts: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
      },
    } as Parameters<typeof prisma.ticketReport.findUnique>[0]);
    if (!report) throw new Error("NOT_FOUND");
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:ticketId/report — technician submits
router.post("/", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await getTicketForUser(req.params.ticketId, req.user);

    if (ticket.status !== "PENDING_REPORT") {
      res.status(422).json({ success: false, message: "Solo se puede enviar el reporte cuando el ticket está en estado Reporte pendiente" });
      return;
    }

    const existing = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (existing) throw new Error("CONFLICT");

    const body = reportSchema.parse(req.body);

    const template = await getEffectiveTemplate(req.params.ticketId, ticket.companyId);

    // Validate required fields
    for (const field of template.fields) {
      if (field.required && (!body.responses[field.id] || !body.responses[field.id].trim())) {
        res.status(422).json({ success: false, message: `El campo "${field.label}" es requerido` });
        return;
      }
    }

    const report = await prisma.ticketReport.create({
      data: {
        responses: body.responses,
        techSignature: body.techSignature,
        clientSignature: body.clientSignature,
        templateId: template.id,
        ticketId: req.params.ticketId,
        requiresSpareParts: body.requiresSpareParts,
        spareParts: body.requiresSpareParts && body.spareParts?.length
          ? { create: body.spareParts.map(({ inventoryItemId, quantity }) => ({ inventoryItemId, quantity })) }
          : undefined,
      },
      include: {
        template: { include: { fields: { orderBy: { order: "asc" } } } },
        spareParts: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
      },
    } as Parameters<typeof prisma.ticketReport.create>[0]);

    await prisma.ticket.update({
      where: { id: req.params.ticketId },
      data: { status: "COMPLETED", closedAt: new Date() },
    });

    (prisma.ticketStatusHistory as any)
      .create({ data: { ticketId: req.params.ticketId, status: "COMPLETED", changedBy: req.user!.userId } })
      .catch(() => {});

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:ticketId/report — update report when ticket is REOPENED; transitions ticket back to COMPLETED
router.put("/", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await getTicketForUser(req.params.ticketId, req.user);

    if (ticket.status !== "REOPENED") {
      res.status(422).json({ success: false, message: "Solo se puede modificar el reporte de un ticket reabierto" });
      return;
    }

    const report = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (!report) throw new Error("NOT_FOUND");

    const body = reportSchema.partial().parse(req.body);

    // Replace spare parts when requiresSpareParts is provided
    if (body.requiresSpareParts !== undefined) {
      await (prisma.ticketReportSparePart as any).deleteMany({ where: { reportId: report.id } });
    }

    const updated = await prisma.ticketReport.update({
      where: { ticketId: req.params.ticketId },
      data: {
        ...(body.responses ? { responses: body.responses } : {}),
        ...(body.techSignature !== undefined ? { techSignature: body.techSignature } : {}),
        ...(body.clientSignature !== undefined ? { clientSignature: body.clientSignature } : {}),
        ...(body.requiresSpareParts !== undefined ? { requiresSpareParts: body.requiresSpareParts } : {}),
      },
      include: {
        template: { include: { fields: { orderBy: { order: "asc" } } } },
        spareParts: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
      },
    } as Parameters<typeof prisma.ticketReport.update>[0]);

    if (body.requiresSpareParts && body.spareParts?.length) {
      await (prisma.ticketReportSparePart as any).createMany({
        data: body.spareParts.map(({ inventoryItemId, quantity }: { inventoryItemId: string; quantity: number }) => ({
          reportId: report.id,
          inventoryItemId,
          quantity,
        })),
      });
    }

    // Transition ticket back to COMPLETED
    await prisma.ticket.update({
      where: { id: req.params.ticketId },
      data: { status: "COMPLETED", closedAt: new Date() },
    });

    (prisma.ticketStatusHistory as any)
      .create({ data: { ticketId: req.params.ticketId, status: "COMPLETED", changedBy: req.user!.userId } })
      .catch(() => {});

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
