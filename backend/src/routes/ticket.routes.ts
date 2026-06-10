import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role } from "@prisma/client";
import { getPlanLimits } from "../utils/plan-limits";
import { expireOverdueTickets } from "../utils/expire-tickets";
import { sendApprovalRequestEmail } from "../utils/email";
import { generateTicketPdf } from "../utils/pdf-report";
import { clean, cleanOpt } from "../utils/sanitize";

const router = Router();

const isAdminRole = (role: string) => role === Role.ADMIN || role === Role.SUPER_ADMIN;

function recordStatus(ticketId: string, status: string, userId?: string) {
  (prisma.ticketStatusHistory as any)
    .create({ data: { ticketId, status, changedBy: userId ?? null } })
    .catch(() => {});
}

const createSchema = z.object({
  title:        z.string().min(3).transform(clean),
  description:  z.string().optional().transform(cleanOpt),
  priority:     z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  clientId:     z.string().optional(),
  branchId:     z.string().optional(),
  equipmentId:  z.string().optional(),
  technicianId: z.string().optional(),
  scheduledAt:  z.string().datetime().optional(),
});

const editSchema = z.object({
  title:       z.string().min(3).optional().transform(cleanOpt),
  description: z.string().optional().transform(cleanOpt),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
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
    const {
      status, priority, year, page = "1", limit = "20",
      search,
      clientId: clientFilter,
      technicianId: technicianFilter,
      branchId,
      equipmentId,
      orderBy = "createdAt",
    } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));
    const { role, userId, companyId, clientId } = req.user!;

    const statuses = status ? status.split(",").filter(Boolean) : [];

    const yearFilter = year
      ? {
          createdAt: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
          },
        }
      : {};

    const where: Record<string, unknown> = {
      ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(clientFilter ? { clientId: clientFilter } : {}),
      ...(technicianFilter ? { technicianId: technicianFilter } : {}),
      ...(branchId ? { branchId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
      ...yearFilter,
    };

    if (isAdminRole(role)) where.companyId = companyId;
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
        orderBy: { [orderBy === "updatedAt" ? "updatedAt" : "createdAt"]: "desc" },
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

// GET /api/tickets/time-analytics — avg hours per status per client (admin only)
router.get("/time-analytics", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.user!;

    const tickets = await prisma.ticket.findMany({
      where: { companyId: companyId! },
      select: {
        clientId: true,
        branchId: true,
        client: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        statusHistory: {
          select: { status: true, changedAt: true },
          orderBy: { changedAt: "asc" },
        },
      },
    });

    // clientId → { name, statusTimes, branches: branchId → { name, statusTimes } }
    const acc: Record<string, {
      name: string;
      statusTimes: Record<string, number[]>;
      branches: Record<string, { name: string; statusTimes: Record<string, number[]> }>;
    }> = {};

    for (const t of tickets) {
      if (!t.clientId || !t.client || t.statusHistory.length < 2) continue;

      if (!acc[t.clientId]) {
        acc[t.clientId] = { name: t.client.name, statusTimes: {}, branches: {} };
      }

      // Time in state i = changedAt[i+1] - changedAt[i]  (exclude last/current state)
      for (let i = 0; i < t.statusHistory.length - 1; i++) {
        const start = new Date(t.statusHistory[i].changedAt).getTime();
        const end   = new Date(t.statusHistory[i + 1].changedAt).getTime();
        const hours = (end - start) / 3_600_000;
        const status = t.statusHistory[i].status as string;

        (acc[t.clientId].statusTimes[status] ??= []).push(hours);

        if (t.branchId && t.branch) {
          (acc[t.clientId].branches[t.branchId] ??= { name: t.branch.name, statusTimes: {} });
          (acc[t.clientId].branches[t.branchId].statusTimes[status] ??= []).push(hours);
        }
      }
    }

    const avg = (arr: number[]) =>
      Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;

    const data = Object.entries(acc).map(([clientId, c]) => ({
      clientId,
      clientName: c.name,
      avgByStatus: Object.fromEntries(Object.entries(c.statusTimes).map(([s, v]) => [s, avg(v)])),
      branches: Object.entries(c.branches).map(([branchId, b]) => ({
        branchId,
        branchName: b.name,
        avgByStatus: Object.fromEntries(Object.entries(b.statusTimes).map(([s, v]) => [s, avg(v)])),
      })),
    }));

    res.json({ success: true, data });
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
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });

    if (!ticket) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
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
    if (!isAdminRole(role) && role !== Role.CLIENT_USER) throw new Error("FORBIDDEN");

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

    // Enforce monthly ticket limit
    const resolvedCompanyId = isAdminRole(role)
      ? companyId!
      : (await prisma.client.findUnique({ where: { id: resolvedClientId }, select: { companyId: true } }))!.companyId;

    const limits = await getPlanLimits(resolvedCompanyId);
    if (limits?.ticketMax !== null && limits?.ticketMax !== undefined) {
      const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const monthlyCount = await prisma.ticket.count({ where: { companyId: resolvedCompanyId, createdAt: { gte: periodStart } } });
      if (monthlyCount >= limits.ticketMax) throw new Error("PLAN_LIMIT");
    }

    // If admin assigns a technician at creation time, start as ASSIGNED
    const initialStatus = isAdminRole(role) && body.technicianId ? "ASSIGNED" : "PENDING";

    const ticket = await prisma.ticket.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        branchId: body.branchId,
        equipmentId: body.equipmentId,
        technicianId: isAdminRole(role) ? body.technicianId : undefined,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: initialStatus,
        clientId: resolvedClientId,
        companyId: resolvedCompanyId,
      },
      include: {
        client: { select: { id: true, name: true } },
        technician: { select: { id: true, name: true } },
      },
    });

    recordStatus(ticket.id, initialStatus, req.user!.userId);
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

    recordStatus(req.params.id, "ASSIGNED", req.user!.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/checkin — technician checks in at branch (ASSIGNED → ON_SITE)
router.patch("/:id/checkin", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.user!;
    if (role !== Role.TECHNICIAN) throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.technicianId !== userId) throw new Error("FORBIDDEN");
    if (ticket.status !== "ASSIGNED") {
      res.status(422).json({ success: false, message: "Solo se puede hacer check-in en tickets en estado Asignado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "ON_SITE" },
    });

    recordStatus(req.params.id, "ON_SITE", userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/start — technician starts work (ON_SITE → IN_PROGRESS)
router.patch("/:id/start", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.user!;
    if (role !== Role.TECHNICIAN) throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.technicianId !== userId) throw new Error("FORBIDDEN");
    if (ticket.status !== "ON_SITE") {
      res.status(422).json({ success: false, message: "Solo se pueden iniciar tickets en estado En sitio" });
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

    recordStatus(req.params.id, "IN_PROGRESS", userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/finish — technician finishes job, moves to report filling (IN_PROGRESS → PENDING_REPORT)
router.patch("/:id/finish", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = req.user!;
    if (role !== Role.TECHNICIAN) throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.technicianId !== userId) throw new Error("FORBIDDEN");
    if (ticket.status !== "IN_PROGRESS") {
      res.status(422).json({ success: false, message: "Solo se pueden finalizar tickets en estado En progreso" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "PENDING_REPORT" },
    });

    recordStatus(req.params.id, "PENDING_REPORT", userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/reopen — admin reopens a COMPLETED ticket for report correction
router.patch("/:id/reopen", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "COMPLETED") {
      res.status(422).json({ success: false, message: "Solo se pueden reabrir tickets en estado Completado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "REOPENED", closedAt: null },
    });

    recordStatus(req.params.id, "REOPENED", req.user!.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/close — admin closes (COMPLETED → CLOSED), auto-creates follow-up if spare parts required
router.patch("/:id/close", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "COMPLETED") {
      res.status(422).json({ success: false, message: "Solo se pueden cerrar tickets en estado Completado" });
      return;
    }

    const report = await (prisma.ticketReport as any).findUnique({
      where: { ticketId: req.params.id },
      include: { spareParts: true },
    });

    const needsFollowUp = report?.requiresSpareParts && report.spareParts?.length > 0;

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    recordStatus(req.params.id, "CLOSED", req.user!.userId);

    // Generate PDF report asynchronously — fire and forget
    generateTicketPdf(req.params.id)
      .then((url) => {
        if (url) {
          return (prisma.ticket as any).update({
            where: { id: req.params.id },
            data: { reportPdfUrl: url },
          });
        }
      })
      .catch((err: unknown) => console.error("[pdf-report] background error:", err));

    if (needsFollowUp) {
      await (prisma.ticket as any).create({
        data: {
          title: `[Repuestos] ${ticket.title}`,
          description: `Seguimiento para instalación de repuestos requeridos en: ${ticket.title}`,
          status: "REVIEW",
          priority: ticket.priority,
          clientId: ticket.clientId,
          companyId: ticket.companyId,
          branchId: ticket.branchId,
          equipmentId: ticket.equipmentId,
          parentTicketId: ticket.id,
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/submit-review — admin uploads document and moves REVIEW → PENDING_APPROVAL
router.patch("/:id/submit-review", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reviewDocument } = z.object({ reviewDocument: z.string().url() }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "REVIEW") {
      res.status(422).json({ success: false, message: "Solo tickets en revisión pueden enviarse a aprobación" });
      return;
    }

    const updated = await (prisma.ticket as any).update({
      where: { id: req.params.id },
      data: { status: "PENDING_APPROVAL", reviewDocument },
    });

    recordStatus(req.params.id, "PENDING_APPROVAL", req.user!.userId);

    // Send email to all active CLIENT_USER accounts for this client
    const clientUsers = await prisma.user.findMany({
      where: { clientId: ticket.clientId, isActive: true, role: "CLIENT_USER" },
      select: { email: true },
    });
    const company = await prisma.company.findUnique({ where: { id: ticket.companyId }, select: { name: true } });

    if (clientUsers.length) {
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
      sendApprovalRequestEmail({
        to: clientUsers.map((u) => u.email),
        ticketTitle: ticket.title,
        documentUrl: reviewDocument,
        companyName: company?.name ?? "deployr",
        approvalUrl: `${frontendUrl}/client/tickets/${ticket.id}`,
      }).catch(() => {}); // fire-and-forget; don't fail the request if email fails
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/approve — admin or client approves (PENDING_APPROVAL → PENDING)
router.patch("/:id/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    if (!isAdminRole(role) && role !== "CLIENT_USER") throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === "CLIENT_USER" && ticket.clientId !== clientId) throw new Error("FORBIDDEN");
    if (ticket.status !== "PENDING_APPROVAL") {
      res.status(422).json({ success: false, message: "Solo tickets en aprobación pendiente pueden aprobarse" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "PENDING" },
    });

    recordStatus(req.params.id, "PENDING", req.user!.userId);

    // Deduct spare parts from inventory when the follow-up ticket is approved
    if ((ticket as any).parentTicketId) {
      const parentReport = await (prisma.ticketReport as any).findUnique({
        where: { ticketId: (ticket as any).parentTicketId },
        include: { spareParts: true },
      });

      if (parentReport?.spareParts?.length) {
        await Promise.all(
          parentReport.spareParts.map(async (sp: { inventoryItemId: string; quantity: number }) => {
            await prisma.inventoryItem.updateMany({
              where: { id: sp.inventoryItemId, quantity: { gte: sp.quantity } },
              data: { quantity: { decrement: sp.quantity } },
            });
          })
        );
      }
    }

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

    recordStatus(req.params.id, "CANCELLED", req.user!.userId);
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
