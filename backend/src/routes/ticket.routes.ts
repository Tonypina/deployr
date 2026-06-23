import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role, TicketStatus } from "@prisma/client";
import { getPlanLimits } from "../utils/plan-limits";
import { expireOverdueTickets } from "../utils/expire-tickets";
import { sendApprovalRequestEmail } from "../utils/email";
import { generateTicketPdf } from "../utils/pdf-report";
import { clean, cleanOpt } from "../utils/sanitize";

const router = Router();

const isAdminRole = (role: string) => role === Role.ADMIN || role === Role.SUPER_ADMIN;

function recordStatus(ticketId: string, status: TicketStatus, userId?: string) {
  prisma.ticketStatusHistory
    .create({ data: { ticketId, status, changedBy: userId ?? null } })
    .catch((err: unknown) =>
      console.error(`[ticket] failed to record status ${status} for ${ticketId}:`, err)
    );
}

const createSchema = z.object({
  title:        z.string().min(3).transform(clean),
  description:  z.string().optional().transform(cleanOpt),
  priority:     z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  clientId:     z.string().optional(),
  branchId:     z.string().optional(),
  equipmentId:  z.string().optional(),
  scheduledAt:  z.string().datetime().optional(),
  policyId:     z.string().optional(),
});

// Resolves a policy the admin wants to attach a ticket to: it must belong to the
// admin's company and cover the same client as the ticket. The caller checks that
// the policy is ACTIVE so it can return a friendly 422 instead of a control error.
async function resolvePolicy(policyId: string, companyId: string, clientId: string) {
  const policy = await prisma.policy.findFirst({ where: { id: policyId, companyId } });
  if (!policy) throw new Error("NOT_FOUND");
  if (policy.clientId !== clientId) throw new Error("FORBIDDEN");
  return policy;
}

const editSchema = z.object({
  title:       z.string().min(3).optional().transform(cleanOpt),
  description: z.string().optional().transform(cleanOpt),
  priority:    z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const assignSchema = z.object({
  technicianIds: z.array(z.string()).min(1),
  scheduledAt: z.string().datetime().optional(),
});

router.use(authenticate);

// GET /api/tickets — filtered by role
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Expire overdue tickets before listing. Awaited (not fire-and-forget) so it
    // actually runs on serverless; its own errors are logged and never break the
    // list. A scheduled job would be better, but this keeps the data consistent.
    await expireOverdueTickets().catch((e) => console.error("[tickets] expire failed:", e));

    const {
      status, priority, year, from, to, page = "1", limit = "20",
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

    // Explicit from/to range takes precedence over `year`. Both are ISO date
    // strings from the client; invalid values are ignored so the filter never
    // throws and simply widens the range on that bound.
    let dateFilter: { createdAt?: Record<string, Date> } = {};
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;
      if (fromDate && !isNaN(fromDate.getTime())) createdAt.gte = fromDate;
      if (toDate && !isNaN(toDate.getTime())) createdAt.lte = toDate;
      if (Object.keys(createdAt).length > 0) dateFilter = { createdAt };
    } else if (year) {
      dateFilter = {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
          lt: new Date(`${Number(year) + 1}-01-01T00:00:00.000Z`),
        },
      };
    }

    const where: Record<string, unknown> = {
      ...(statuses.length > 0 ? { status: { in: statuses } } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
      ...(clientFilter ? { clientId: clientFilter } : {}),
      ...(technicianFilter ? { technicians: { some: { id: technicianFilter } } } : {}),
      ...(branchId ? { branchId } : {}),
      ...(equipmentId ? { equipmentId } : {}),
      ...dateFilter,
    };

    if (isAdminRole(role)) where.companyId = companyId;
    else if (role === Role.TECHNICIAN) where.technicians = { some: { id: userId } };
    else if (role === Role.CLIENT_USER) where.clientId = clientId;

    const [tickets, total] = await prisma.$transaction([
      prisma.ticket.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true, city: true } },
          equipment: { select: { id: true, name: true } },
          technicians: { select: { id: true, name: true } },
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
        technicians: { select: { id: true, name: true, email: true, phone: true } },
        report: true,
        company: { select: { id: true, name: true } },
        statusHistory: { orderBy: { changedAt: "asc" } },
      },
    });

    if (!ticket) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === Role.TECHNICIAN && !ticket.technicians.some((t) => t.id === userId)) throw new Error("FORBIDDEN");
    if (role === Role.CLIENT_USER && ticket.clientId !== clientId) throw new Error("FORBIDDEN");

    res.json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/previous-service — most recent prior serviced ticket for the
// same equipment, including its report. Lets the assigned technician review the
// equipment's last service before starting. Returns null when there is no history.
router.get("/:id/previous-service", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId, userId } = req.user!;

    const current = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      select: { id: true, companyId: true, clientId: true, equipmentId: true, createdAt: true, technicians: { select: { id: true } } },
    });
    if (!current) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && current.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === Role.TECHNICIAN && !current.technicians.some((t) => t.id === userId)) throw new Error("FORBIDDEN");
    if (role === Role.CLIENT_USER && current.clientId !== clientId) throw new Error("FORBIDDEN");

    // No equipment linked → no service history to compare against.
    if (!current.equipmentId) {
      res.json({ success: true, data: null });
      return;
    }

    // The most recent *earlier* ticket for this equipment that already has a report.
    const previous = await prisma.ticket.findFirst({
      where: {
        equipmentId: current.equipmentId,
        companyId: current.companyId,
        id: { not: current.id },
        createdAt: { lt: current.createdAt },
        report: { isNot: null },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        closedAt: true,
        reportPdfUrl: true,
        technicians: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        report: {
          include: {
            template: { include: { fields: { orderBy: { order: "asc" } } } },
            spareParts: { include: { inventoryItem: { select: { id: true, name: true, unit: true } } } },
          },
        },
      },
    });

    res.json({ success: true, data: previous });
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

    // By default a ticket — admin- or client-created — enters the lifecycle as
    // REQUESTED: the admin uploads a quotation, the client approves it, and only
    // then is the ticket assigned to a technician.
    //
    // An admin may instead attach the ticket to an active client policy. Policy work
    // is pre-paid under contract, so it skips the quotation/approval flow and starts
    // in PENDING_ASSIGN. Only admins can do this; a policyId from a client is ignored.
    let policyId: string | undefined;
    let initialStatus: TicketStatus = "REQUESTED";
    if (isAdminRole(role) && body.policyId) {
      const policy = await resolvePolicy(body.policyId, resolvedCompanyId, resolvedClientId);
      if (policy.status !== "ACTIVE") {
        res.status(422).json({ success: false, message: "Solo se pueden agregar tickets a pólizas activas" });
        return;
      }
      policyId = policy.id;
      initialStatus = "PENDING_ASSIGN";
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority,
        branchId: body.branchId,
        equipmentId: body.equipmentId,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        status: initialStatus,
        clientId: resolvedClientId,
        companyId: resolvedCompanyId,
        policyId,
      },
      include: {
        client: { select: { id: true, name: true } },
        technicians: { select: { id: true, name: true } },
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

// PATCH /api/tickets/:id/quotation — admin uploads/updates the quotation document (REQUESTED only)
router.patch("/:id/quotation", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { quotationDocument } = z.object({ quotationDocument: z.string().url() }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "REQUESTED") {
      res.status(422).json({ success: false, message: "Solo se puede subir la cotización mientras el ticket está en estado Solicitado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { quotationDocument },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/send-quotation — admin sends the quotation for client approval (REQUESTED → PENDING_CLIENT_APPROVAL)
router.patch("/:id/send-quotation", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "REQUESTED") {
      res.status(422).json({ success: false, message: "Solo tickets en estado Solicitado pueden enviarse a aprobación" });
      return;
    }
    if (!ticket.quotationDocument) {
      res.status(422).json({ success: false, message: "Sube la cotización antes de enviarla al cliente" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "PENDING_CLIENT_APPROVAL" },
    });

    recordStatus(req.params.id, "PENDING_CLIENT_APPROVAL", req.user!.userId);

    // Notify the client's portal users that a quotation awaits their approval.
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
        documentUrl: ticket.quotationDocument,
        companyName: company?.name ?? "deployr",
        approvalUrl: `${frontendUrl}/client/tickets/${ticket.id}`,
      }).catch(() => {}); // fire-and-forget
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/reject — admin or client rejects the quotation (PENDING_CLIENT_APPROVAL → REQUESTED)
router.patch("/:id/reject", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    if (!isAdminRole(role) && role !== "CLIENT_USER") throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === "CLIENT_USER" && ticket.clientId !== clientId) throw new Error("FORBIDDEN");
    if (ticket.status !== "PENDING_CLIENT_APPROVAL") {
      res.status(422).json({ success: false, message: "Solo se puede rechazar una cotización pendiente de aprobación" });
      return;
    }

    // Send the ticket back so the admin can upload a revised quotation.
    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "REQUESTED", quotationDocument: null },
    });

    recordStatus(req.params.id, "REQUESTED", req.user!.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/policy — admin attaches the ticket to an active client policy,
// skipping the quotation/approval flow (REQUESTED | PENDING_CLIENT_APPROVAL → PENDING_ASSIGN)
router.patch("/:id/policy", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { policyId } = z.object({ policyId: z.string() }).parse(req.body);

    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "REQUESTED" && ticket.status !== "PENDING_CLIENT_APPROVAL") {
      res.status(422).json({ success: false, message: "Solo se puede agregar a una póliza un ticket en estado Solicitado o En aprobación" });
      return;
    }

    const policy = await resolvePolicy(policyId, req.user!.companyId!, ticket.clientId);
    if (policy.status !== "ACTIVE") {
      res.status(422).json({ success: false, message: "Solo se pueden agregar tickets a pólizas activas" });
      return;
    }

    // Policy work is pre-paid, so drop any in-progress quotation and go straight to assignment.
    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { policyId: policy.id, status: "PENDING_ASSIGN", quotationDocument: null },
    });

    recordStatus(req.params.id, "PENDING_ASSIGN", req.user!.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/assign — admin assigns a technician (PENDING_ASSIGN → ASSIGNED)
router.patch("/:id/assign", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = assignSchema.parse(req.body);
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "PENDING_ASSIGN") {
      res.status(422).json({ success: false, message: "Solo se pueden asignar tickets en estado Por asignar" });
      return;
    }

    const techs = await prisma.user.findMany({
      where: { id: { in: body.technicianIds }, companyId: req.user!.companyId!, role: "TECHNICIAN", isActive: true },
    });
    if (techs.length !== body.technicianIds.length) throw new Error("NOT_FOUND");

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        technicians: { set: body.technicianIds.map((techId) => ({ id: techId })) },
        status: "ASSIGNED",
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
      include: { technicians: { select: { id: true, name: true } } },
    });

    recordStatus(req.params.id, "ASSIGNED", req.user!.userId);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/reassign — admin changes the assigned technician (ASSIGNED only, before ON_SITE)
router.patch("/:id/reassign", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = assignSchema.parse(req.body);
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (ticket.status !== "ASSIGNED") {
      res.status(422).json({ success: false, message: "Solo se pueden reasignar tickets en estado Asignado" });
      return;
    }

    const techs = await prisma.user.findMany({
      where: { id: { in: body.technicianIds }, companyId: req.user!.companyId!, role: "TECHNICIAN", isActive: true },
    });
    if (techs.length !== body.technicianIds.length) throw new Error("NOT_FOUND");

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        technicians: { set: body.technicianIds.map((techId) => ({ id: techId })) },
        ...(body.scheduledAt ? { scheduledAt: new Date(body.scheduledAt) } : {}),
      },
      include: { technicians: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/tickets/:id/reschedule — admin reschedules the visit; resets status to ASSIGNED
// (if a technician is assigned) or PENDING_ASSIGN (if not). Only valid after the assignment
// step and before the ticket is closed.
router.patch("/:id/reschedule", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { scheduledAt } = z.object({ scheduledAt: z.string().datetime().nullable() }).parse(req.body);
    const ticket = await prisma.ticket.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: { technicians: { select: { id: true } } },
    });
    if (!ticket) throw new Error("NOT_FOUND");

    const blocked: TicketStatus[] = ["CLOSED", "CANCELLED", "EXPIRED", "REQUESTED", "PENDING_CLIENT_APPROVAL", "PENDING_ASSIGN"];
    if (blocked.includes(ticket.status)) {
      res.status(422).json({ success: false, message: "No se puede reprogramar el ticket en su estado actual" });
      return;
    }

    const newStatus: TicketStatus = ticket.technicians.length > 0 ? "ASSIGNED" : "PENDING_ASSIGN";

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: newStatus,
        startedAt: null,
      },
    });

    recordStatus(req.params.id, newStatus, req.user!.userId);
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { technicians: { select: { id: true } } },
    });
    if (!ticket) throw new Error("NOT_FOUND");
    if (!ticket.technicians.some((t) => t.id === userId)) throw new Error("FORBIDDEN");
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { technicians: { select: { id: true } } },
    });
    if (!ticket) throw new Error("NOT_FOUND");
    if (!ticket.technicians.some((t) => t.id === userId)) throw new Error("FORBIDDEN");
    if (ticket.status !== "ON_SITE") {
      res.status(422).json({ success: false, message: "Solo se pueden iniciar tickets en estado En sitio" });
      return;
    }

    // One-at-a-time constraint
    const inProgress = await prisma.ticket.findFirst({ where: { technicians: { some: { id: userId } }, status: "IN_PROGRESS" } });
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

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: { technicians: { select: { id: true } } },
    });
    if (!ticket) throw new Error("NOT_FOUND");
    if (!ticket.technicians.some((t) => t.id === userId)) throw new Error("FORBIDDEN");
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

// PATCH /api/tickets/:id/take-over — admin skips field workflow and fills the report themselves
router.patch("/:id/take-over", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (!["PENDING_ASSIGN", "ASSIGNED"].includes(ticket.status)) {
      res.status(422).json({ success: false, message: "Solo se puede tomar un ticket en estado Por asignar o Asignado" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "PENDING_REPORT" },
    });

    recordStatus(req.params.id, "PENDING_REPORT", req.user!.userId);
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

    const report = await prisma.ticketReport.findUnique({
      where: { ticketId: req.params.id },
      include: { spareParts: true },
    });

    const needsFollowUp = report?.requiresSpareParts && report.spareParts?.length > 0;

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });

    recordStatus(req.params.id, "CLOSED", req.user!.userId);

    // Generate the PDF report and persist its URL. This is awaited rather than
    // fire-and-forget because on serverless (Vercel) any work kicked off after
    // the response is sent is not guaranteed to run — the function may freeze.
    try {
      const url = await generateTicketPdf(req.params.id);
      if (url) {
        await prisma.ticket.update({
          where: { id: req.params.id },
          data: { reportPdfUrl: url },
        });
      }
    } catch (err) {
      console.error("[pdf-report] generation error:", err);
    }

    if (needsFollowUp) {
      await prisma.ticket.create({
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

    const updated = await prisma.ticket.update({
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

// PATCH /api/tickets/:id/approve — admin or client approves, moving the ticket to PENDING_ASSIGN.
// Handles both the quotation approval (PENDING_CLIENT_APPROVAL) and the spare-parts
// follow-up review approval (PENDING_APPROVAL).
router.patch("/:id/approve", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    if (!isAdminRole(role) && role !== "CLIENT_USER") throw new Error("FORBIDDEN");

    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (isAdminRole(role) && ticket.companyId !== companyId) throw new Error("FORBIDDEN");
    if (role === "CLIENT_USER" && ticket.clientId !== clientId) throw new Error("FORBIDDEN");
    if (ticket.status !== "PENDING_CLIENT_APPROVAL" && ticket.status !== "PENDING_APPROVAL") {
      res.status(422).json({ success: false, message: "Solo tickets en aprobación pendiente pueden aprobarse" });
      return;
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: "PENDING_ASSIGN" },
    });

    recordStatus(req.params.id, "PENDING_ASSIGN", req.user!.userId);

    // Deduct spare parts from inventory when the follow-up ticket is approved
    if (ticket.parentTicketId) {
      const parentReport = await prisma.ticketReport.findUnique({
        where: { ticketId: ticket.parentTicketId },
        include: { spareParts: true },
      });

      if (parentReport?.spareParts?.length) {
        // The `quantity: { gte }` guard prevents negative stock, but means an
        // under-stocked item is silently skipped. Capture those so the shortfall
        // is at least visible in logs instead of vanishing.
        const shortfalls: string[] = [];
        await Promise.all(
          parentReport.spareParts.map(async (sp: { inventoryItemId: string; quantity: number }) => {
            const result = await prisma.inventoryItem.updateMany({
              where: { id: sp.inventoryItemId, quantity: { gte: sp.quantity } },
              data: { quantity: { decrement: sp.quantity } },
            });
            if (result.count === 0) {
              shortfalls.push(`${sp.inventoryItemId} (needed ${sp.quantity})`);
            }
          })
        );
        if (shortfalls.length) {
          console.warn(
            `[ticket ${req.params.id}] spare parts not deducted (insufficient/missing stock): ${shortfalls.join(", ")}`
          );
        }
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
