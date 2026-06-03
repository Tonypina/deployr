import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdminOrClient } from "../middleware/auth";
import { AuthRequest } from "../types";

import { clean, cleanEmail, cleanOpt, cleanEmailOpt } from "../utils/sanitize";

const router = Router({ mergeParams: true }); // /api/clients/:clientId/branches

const branchSchema = z.object({
  name:         z.string().min(2).transform(clean),
  address:      z.string().min(3).transform(clean),
  city:         z.string().optional().transform(cleanOpt),
  phone:        z.string().optional().transform(cleanOpt),
  contactName:  z.string().optional().transform(cleanOpt),
  contactEmail: z.string().email().optional().transform(cleanEmailOpt),
});

// GET /api/clients/:clientId/branches
router.get("/", authenticate, requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");

    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, companyId: req.user!.companyId! },
    });
    if (!client) throw new Error("NOT_FOUND");

    const branches = await prisma.branch.findMany({
      where: { clientId: req.params.clientId },
      include: { _count: { select: { equipment: true, tickets: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: branches });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients/:clientId/branches
router.post("/", authenticate, requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const body = branchSchema.parse(req.body);
    const client = await prisma.client.findFirst({
      where: { id: req.params.clientId, companyId: req.user!.companyId! },
    });
    if (!client) throw new Error("NOT_FOUND");

    const branch = await prisma.branch.create({
      data: { ...body, clientId: req.params.clientId },
    });

    res.status(201).json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:clientId/branches/:id
router.get("/:id", authenticate, requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const branch = await prisma.branch.findFirst({
      where: { id: req.params.id, clientId: req.params.clientId },
      include: { equipment: { include: { product: true } }, client: { select: { companyId: true } } },
    });
    if (!branch || branch.client.companyId !== req.user!.companyId) throw new Error("NOT_FOUND");
    res.json({ success: true, data: branch });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:clientId/branches/:id
router.put("/:id", authenticate, requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const body = branchSchema.partial().parse(req.body);
    const branch = await prisma.branch.findFirst({
      where: { id: req.params.id, clientId: req.params.clientId },
      include: { client: { select: { companyId: true } } },
    });
    if (!branch || branch.client.companyId !== req.user!.companyId) throw new Error("NOT_FOUND");

    const updated = await prisma.branch.update({ where: { id: req.params.id }, data: body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clients/:clientId/branches/:id
router.delete("/:id", authenticate, requireAdminOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const branch = await prisma.branch.findFirst({
      where: { id: req.params.id, clientId: req.params.clientId },
      include: { client: { select: { companyId: true } } },
    });
    if (!branch || branch.client.companyId !== req.user!.companyId) throw new Error("NOT_FOUND");
    await prisma.branch.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Branch deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
