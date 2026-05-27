import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Role } from "@prisma/client";
import { getEffectiveTemplate } from "../utils/default-template";

const router = Router({ mergeParams: true }); // /api/tickets/:ticketId/report

const reportSchema = z.object({
  responses: z.record(z.string()),
  techSignature: z.string().optional(),
  clientSignature: z.string().optional(),
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
      include: { template: { include: { fields: { orderBy: { order: "asc" } } } } },
    });
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

    if (ticket.status !== "IN_PROGRESS") {
      res.status(422).json({ success: false, message: "Solo se puede enviar el reporte cuando el ticket está En Progreso" });
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
      },
      include: { template: { include: { fields: { orderBy: { order: "asc" } } } } },
    });

    await prisma.ticket.update({
      where: { id: req.params.ticketId },
      data: { status: "COMPLETED", closedAt: new Date() },
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:ticketId/report — update (admin/tech, only before ticket is CLOSED)
router.put("/", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await getTicketForUser(req.params.ticketId, req.user);

    const report = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (!report) throw new Error("NOT_FOUND");

    const body = reportSchema.partial().parse(req.body);

    const updated = await prisma.ticketReport.update({
      where: { ticketId: req.params.ticketId },
      data: {
        ...(body.responses ? { responses: body.responses } : {}),
        ...(body.techSignature !== undefined ? { techSignature: body.techSignature } : {}),
        ...(body.clientSignature !== undefined ? { clientSignature: body.clientSignature } : {}),
      },
      include: { template: { include: { fields: { orderBy: { order: "asc" } } } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
