import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role, TicketStatus } from "@prisma/client";

const router = Router();

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  clientId: z.string(),
  branchId: z.string().optional(),
  equipmentId: z.string().optional(),
  technicianId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const updateSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  technicianId: z.string().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

router.use(authenticate);

// GET /api/tickets — filtered by role
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, priority, page = "1", limit = "20" } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));
    const { role, userId, companyId, clientId } = req.user!;

    const where: Record<string, unknown> = {
      ...(status ? { status: status as TicketStatus } : {}),
      ...(priority ? { priority } : {}),
    };

    if (role === Role.ADMIN) where.companyId = companyId;
    else if (role === Role.TECHNICIAN) where.technicianId = userId;
    else if (role === Role.CLIENT_USER) where.clientId = clientId;

    const [tickets, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, city: true } },
          equipment: { select: { id: true, name: true } },
          technician: { select: { id: true, name: true } },
          report: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.ticket.count({ where }),
    ]);

    res.json({ success: true, data: { tickets, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId, userId } = req.user!;

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true } },
        branch: true,
        equipment: { include: { product: true } },
        technician: { select: { id: true, name: true, email: true, phone: true } },
        report: true,
        company: { select: { id: true, name: true } },
      },
    });

    if (!ticket) throw new Error("NOT_FOUND");
    if (role === Role.ADMIN && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === Role.TECHNICIAN && ticket.technicianId !== userId) throw new Error("FORBIDDEN");
    if (role === Role.CLIENT_USER && ticket.clientId !== clientId) throw new Error("FORBIDDEN");

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets — admin creates tickets
router.post("/", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);

    const client = await prisma.client.findFirst({ where: { id: body.clientId, companyId: req.user!.companyId! } });
    if (!client) throw new Error("NOT_FOUND");

    const ticket = await prisma.ticket.create({
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        companyId: req.user!.companyId!,
      },
      include: {
        client: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:id
router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const { role, companyId, userId } = req.user!;

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");

    if (role === Role.ADMIN && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === Role.TECHNICIAN) {
      if (ticket.technicianId !== userId) throw new Error("FORBIDDEN");
      // Technicians can only update status
      if (Object.keys(body).some((k) => k !== "status")) {
        res.status(403).json({ success: false, message: "Technicians can only update ticket status" });
        return;
      }
    }

    const updateData: Record<string, unknown> = { ...body };
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }
    if (body.status === "IN_PROGRESS" && !ticket.startedAt) updateData.startedAt = new Date();
    if (body.status === "COMPLETED" || body.status === "CANCELLED") updateData.closedAt = new Date();

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: updateData,
      include: { technician: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tickets/:id — admin only
router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Ticket deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
