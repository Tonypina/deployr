import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Role } from "@prisma/client";

const router = Router({ mergeParams: true }); // /api/tickets/:ticketId/report

const reportSchema = z.object({
  findings: z.string().min(10),
  actions: z.string().min(10),
  partsUsed: z.string().optional(),
  nextVisitDate: z.string().datetime().optional(),
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
    const report = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (!report) throw new Error("NOT_FOUND");
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:ticketId/report — technician creates
router.post("/", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = reportSchema.parse(req.body);
    await getTicketForUser(req.params.ticketId, req.user);

    const existing = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (existing) throw new Error("CONFLICT");

    const report = await prisma.ticketReport.create({
      data: {
        ...body,
        nextVisitDate: body.nextVisitDate ? new Date(body.nextVisitDate) : undefined,
        ticketId: req.params.ticketId,
      },
    });

    // Auto-close ticket when report is submitted
    await prisma.ticket.update({
      where: { id: req.params.ticketId },
      data: { status: "COMPLETED", closedAt: new Date() },
    });

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:ticketId/report
router.put("/", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = reportSchema.partial().parse(req.body);
    await getTicketForUser(req.params.ticketId, req.user);

    const report = await prisma.ticketReport.findUnique({ where: { ticketId: req.params.ticketId } });
    if (!report) throw new Error("NOT_FOUND");

    const updated = await prisma.ticketReport.update({
      where: { ticketId: req.params.ticketId },
      data: {
        ...body,
        nextVisitDate: body.nextVisitDate ? new Date(body.nextVisitDate) : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
