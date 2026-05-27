import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../types";
import { Role } from "@prisma/client";

const router = Router();

const createSchema = z.object({
  requestedAt: z.string().datetime(),
  branchId: z.string().optional(),
  notes: z.string().optional(),
});

const confirmSchema = z.object({
  status: z.enum(["CONFIRMED", "CANCELLED"]),
  ticketId: z.string().optional(),
});

router.use(authenticate);

// GET /api/visits
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, companyId, clientId } = req.user!;
    const { status } = req.query as { status?: string };

    const visits = await prisma.scheduledVisit.findMany({
      where: {
        ...(role === Role.ADMIN ? { client: { companyId: companyId! } } : {}),
        ...(role === Role.CLIENT_USER ? { clientId: clientId! } : {}),
        ...(status ? { status: status as "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, city: true } },
      },
      orderBy: { requestedAt: "asc" },
    });

    res.json({ success: true, data: visits });
  } catch (err) {
    next(err);
  }
});

// POST /api/visits — client schedules a visit
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role !== Role.CLIENT_USER && req.user!.role !== Role.ADMIN) {
      throw new Error("FORBIDDEN");
    }

    const body = createSchema.parse(req.body);
    const clientId = req.user!.role === Role.CLIENT_USER ? req.user!.clientId! : req.body.clientId;

    const visit = await prisma.scheduledVisit.create({
      data: { ...body, requestedAt: new Date(body.requestedAt), clientId },
      include: { branch: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: visit });
  } catch (err) {
    next(err);
  }
});

// PUT /api/visits/:id — admin confirms or cancels
router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = confirmSchema.parse(req.body);
    const visit = await prisma.scheduledVisit.findFirst({
      where: { id: req.params.id, client: { companyId: req.user!.companyId! } },
    });
    if (!visit) throw new Error("NOT_FOUND");

    const updated = await prisma.scheduledVisit.update({
      where: { id: req.params.id },
      data: { status: body.status, ...(body.ticketId ? { ticketId: body.ticketId } : {}) },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

export default router;
