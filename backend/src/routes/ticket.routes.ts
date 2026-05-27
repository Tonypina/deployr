import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role } from "@prisma/client";
import { expireOverdueTickets } from "../utils/expire-tickets";

const router = Router();

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  clientId: z.string().optional(),
  branchId: z.string().optional(),
  equipmentId: z.string().optional(),
  technicianId: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const editSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const assignSchema = z.object({
  technicianId: z.string(),
  scheduledAt: z.string().datetime().optional(),
});

router.use(authenticate);

// GET /api/tickets — filtered by role
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Expire overdue tickets on every list fetch (fire-and-forget)
  expireOverdueTickets().catch(() => {});

  try {
    const { status, priority, page = "1", limit = "20" } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));
    const { role, userId, companyId, clientId } = req.user!;

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
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

// POST /api/tickets — admin or CLIENT_USER
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId: userClientId } = req.user!;
    if (role !== Role.ADMIN && role !== Role.CLIENT_USER) throw new Error("FORBIDDEN");

    const body = createSchema.parse(req.body);

    let resolvedClientId: string;
    if (role === Role.CLIENT_USER) {
      resolvedClientId = userClientId!;
    } else {
      if (!body.clientId) {
        res.status(422).json({ success: false, message: "clientId es requerido" });
        return;
      }
      const client = await prisma.client.findFirst({ where: { id: body.clientId, companyId: companyId! } });
      if (!client) throw new Error("NOT_FOUND");
      resolvedClientId = body.clientId;
    }

    // If admin assigns a technician at creation time, start as ASSIGNED
    const initialStatus = role === Role.ADMIN && body.technicianId ? "ASSIGNED" : "PENDING";

    const ticket = await prisma.ticket.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        branchId: body.branchId,
        equipmentId: body.equipmentId,
        technicianId: role === Role.ADMIN ? body.technicianId : undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: initialStatus,
        clientId: resolvedClientId,
        companyId: role === Role.ADMIN
          ? companyId!
          : (await prisma.client.findUnique({ where: { id: resolvedClientId } }))!.companyId,
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

// PUT /api/tickets/:id — admin edits basic fields (title, description, priority, scheduledAt)
router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = editSchema.parse(req.body);
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");

    const updateData: Record<string, unknown> = { ...body };
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    }

    const updated = await prisma.ticket.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/assign — admin assigns a technician (PENDING → ASSIGNED)
router.patch("/:id/assign", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = assignSchema.parse(req.body);
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "PENDING") {
      res.status(422).json({ success: false, message: "Solo se pueden asignar tickets en estado Pendiente" });
      return;
    }

    const tech = await prisma.user.findFirst({ where: { id: body.technicianId, companyId: req.user!.companyId!, role: "TECHNICIAN" } });
    if (!tech) throw new Error("NOT_FOUND");

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        technicianId: body.technicianId,
        status: "ASSIGNED",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
      include: { technician: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/start — technician starts work (ASSIGNED → IN_PROGRESS)
router.patch("/:id/start", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.user!;
    if (role !== Role.TECHNICIAN) throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.technicianId !== userId) throw new Error("FORBIDDEN");
    if (ticket.status !== "ASSIGNED") {
      res.status(422).json({ success: false, message: "Solo se pueden iniciar tickets en estado Asignado" });
      return;
    }

    // One-at-a-time constraint
    const inProgress = await prisma.ticket.findFirst({ where: { technicianId: userId, status: "IN_PROGRESS" } });
    if (inProgress) {
      res.status(422).json({ success: false, message: "Ya tienes un ticket en progreso. Complétalo antes de iniciar otro." });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/close — admin closes (COMPLETED → CLOSED)
router.patch("/:id/close", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "COMPLETED") {
      res.status(422).json({ success: false, message: "Solo se pueden cerrar tickets en estado Completado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/cancel — admin cancels
router.patch("/:id/cancel", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status === "CLOSED" || ticket.status === "CANCELLED") {
      res.status(422).json({ success: false, message: "Este ticket ya está cerrado o cancelado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "CANCELLED", closedAt: new Date() },
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
