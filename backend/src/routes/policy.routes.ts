import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrClient } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role, Recurrence, TicketStatus, Priority } from "@prisma/client";
import { getPlanLimits } from "../utils/plan-limits";

import { clean, cleanOpt } from "../utils/sanitize";

const router = Router();
router.use(authenticate);

const isAdminRole = (role: string) => role === Role.ADMIN || role === Role.SUPER_ADMIN;

async function assertPoliciesAllowed(companyId: string | undefined): Promise<void> {
  if (!companyId) return;
  const limits = await getPlanLimits(companyId);
  if (limits && !limits.allowPolicies) throw new Error("PLAN_LIMIT");
}

const createSchema = z.object({
  name:         z.string().min(2).transform(clean),
  clientId:     z.string(),
  startDate:    z.string().datetime(),
  endDate:      z.string().datetime(),
  recurrence:   z.enum(["MONTHLY", "BIMONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"]),
  notes:        z.string().optional().transform(cleanOpt),
  equipmentIds: z.array(z.object({ equipmentId: z.string(), branchId: z.string() })).min(1),
});

const updateSchema = z.object({
  name:    z.string().min(2).optional().transform(cleanOpt),
  notes:   z.string().optional().transform(cleanOpt),
  endDate: z.string().datetime().optional(),
});

function recurrenceMonths(r: Recurrence): number {
  switch (r) {
    case "MONTHLY":    return 1;
    case "BIMONTHLY":  return 2;
    case "QUARTERLY":  return 3;
    case "SEMIANNUAL": return 6;
    case "ANNUAL":     return 12;
  }
}

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function computeTicketCount(startDate: Date, endDate: Date, months: number): number {
  let count = 0;
  while (addMonths(startDate, count * months) <= endDate) count++;
  return count - 1;
}

// GET /api/policies
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    const { page = "1", limit = "20", search, clientId: clientFilter, status } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    const where: Record<string, unknown> = {};
    if (isAdminRole(role)) where.companyId = companyId;
    else if (role === Role.CLIENT_USER) where.clientId = clientId;
    else throw new Error("FORBIDDEN");
    if (search) where.name = { contains: search, mode: "insensitive" };
    // Admins may narrow to a single client; client portal users are already scoped above.
    if (clientFilter && isAdminRole(role)) where.clientId = clientFilter;
    if (status) where.status = status;

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          equipment: {
            include: {
              equipment: { select: { id: true, name: true } },
              branch: { select: { id: true, name: true } },
            },
          },
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({ success: true, data: { policies, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

// GET /api/policies/upcoming-tickets — unassigned policy tickets in the next 90 days
router.get("/upcoming-tickets", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    if (role === Role.TECHNICIAN) throw new Error("FORBIDDEN");

    const now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 90);

    const where: Record<string, unknown> = {
      policyId: { not: null },
      status: "PENDING_ASSIGN",
      scheduledAt: { gte: now, lte: horizon },
    };

    if (isAdminRole(role)) where.companyId = companyId;
    else if (role === Role.CLIENT_USER) where.clientId = clientId;

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        equipment: { select: { id: true, name: true } },
        policy: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
      take: 10,
    });

    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
});

// GET /api/policies/:id
router.get("/:id", requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;

    const policy = await prisma.policy.findUnique({
      where: { id: req.params.id as string },
      include: {
        client: { select: { id: true, name: true } },
        equipment: {
          include: {
            equipment: { select: { id: true, name: true, brand: true } },
            branch: { select: { id: true, name: true, city: true } },
          },
        },
        tickets: {
          select: { id: true, title: true, status: true, scheduledAt: true, priority: true },
          orderBy: { scheduledAt: "asc" },
        },
      },
    });

    if (!policy) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && policy.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === Role.CLIENT_USER && policy.clientId !== clientId) throw new Error("FORBIDDEN");

    res.json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// POST /api/policies — admin only, generates tickets per equipment
router.post("/", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await assertPoliciesAllowed(req.user!.companyId);
    const body = createSchema.parse(req.body);
    const { companyId } = req.user!;

    const client = await prisma.client.findFirst({ where: { id: body.clientId, companyId: companyId! } });
    if (!client) throw new Error("NOT_FOUND");

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const months = recurrenceMonths(body.recurrence as Recurrence);
    const totalTickets = computeTicketCount(startDate, endDate, months);

    const policy = await prisma.policy.create({
      data: {
        name: body.name,
        clientId: body.clientId,
        companyId: companyId!,
        startDate,
        endDate,
        totalTickets,
        recurrence: body.recurrence as Recurrence,
        notes: body.notes,
        equipment: {
          create: body.equipmentIds.map(({ equipmentId, branchId }) => ({ equipmentId, branchId })),
        },
      },
      include: {
        equipment: {
          include: { equipment: { select: { id: true, name: true } } },
        },
      },
    });

    // Pre-generate all tickets per equipment
    const ticketData: {
      title: string;
      status: TicketStatus;
      priority: Priority;
      scheduledAt: Date;
      policyId: string;
      clientId: string;
      companyId: string;
      branchId: string;
      equipmentId: string;
    }[] = [];

    for (const pe of policy.equipment) {
      for (let i = 0; i < totalTickets; i++) {
        const scheduledAt = addMonths(startDate, i * months);
        ticketData.push({
          title: `${body.name} - ${pe.equipment.name}`,
          // Policy tickets are pre-paid under contract, so they skip the
          // quotation/approval flow and go straight to assignment.
          status: TicketStatus.PENDING_ASSIGN,
          priority: Priority.HIGH,
          scheduledAt,
          policyId: policy.id,
          clientId: body.clientId,
          companyId: companyId!,
          branchId: pe.branchId,
          equipmentId: pe.equipmentId,
        });
      }
    }

    await prisma.ticket.createMany({ data: ticketData });

    res.status(201).json({ success: true, data: policy });
  } catch (err) {
    next(err);
  }
});

// PUT /api/policies/:id — admin only
router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const policy = await prisma.policy.findFirst({ where: { id: req.params.id as string, companyId: req.user!.companyId! } });
    if (!policy) throw new Error("NOT_FOUND");

    const updated = await prisma.policy.update({
      where: { id: req.params.id as string },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
        ...(body.endDate ? { endDate: new Date(body.endDate) } : {}),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/policies/:id/cancel — admin only
router.patch("/:id/cancel", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const policy = await prisma.policy.findFirst({ where: { id: req.params.id as string, companyId: req.user!.companyId! } });
    if (!policy) throw new Error("NOT_FOUND");
    if (policy.status !== "ACTIVE") {
      res.status(422).json({ success: false, message: "Solo se pueden cancelar pólizas activas" });
      return;
    }

    const [updated] = await prisma.$transaction([
      prisma.policy.update({
        where: { id: req.params.id as string },
        data: { status: "CANCELLED" },
      }),
      prisma.ticket.updateMany({
        where: {
          policyId: req.params.id as string,
          status: { in: ["PENDING_ASSIGN", "ASSIGNED", "ON_SITE", "IN_PROGRESS", "PENDING_REPORT"] },
        },
        data: { status: "CANCELLED" },
      }),
    ]);

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/policies/:id — admin only
router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const policy = await prisma.policy.findFirst({ where: { id: req.params.id as string, companyId: req.user!.companyId! } });
    if (!policy) throw new Error("NOT_FOUND");

    await prisma.policy.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: "Policy deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
