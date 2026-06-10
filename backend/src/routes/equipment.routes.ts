import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTechOrClient } from "../middleware/auth";
import { AuthRequest } from "../types";

import { clean, cleanOpt } from "../utils/sanitize";

const router = Router({ mergeParams: true }); // /api/clients/:clientId/branches/:branchId/equipment

const equipmentSchema = z.object({
  name:         z.string().min(2).transform(clean),
  brand:        z.string().optional().transform(cleanOpt),
  serialNumber: z.string().optional().transform(cleanOpt),
  model:        z.string().optional().transform(cleanOpt),
  notes:        z.string().optional().transform(cleanOpt),
  installedAt:  z.string().datetime().optional(),
  productId:    z.string().optional(),
});

async function getBranchForCompany(branchId: string, clientId: string, companyId: string) {
  return prisma.branch.findFirst({
    where: { id: branchId, clientId, client: { companyId } },
  });
}

// GET - accessible by admins, technicians, and the owning client user
router.get("/", authenticate, requireAdminOrTechOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const branch = await getBranchForCompany(req.params.branchId, req.params.clientId, req.user!.companyId!);
    if (!branch) throw new Error("NOT_FOUND");

    const equipment = await prisma.equipment.findMany({
      where: { branchId: req.params.branchId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: equipment });
  } catch (err) {
    next(err);
  }
});

// GET /:id
router.get("/:id", authenticate, requireAdminOrTechOrClient, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const branch = await getBranchForCompany(req.params.branchId, req.params.clientId, req.user!.companyId!);
    if (!branch) throw new Error("NOT_FOUND");

    const item = await prisma.equipment.findFirst({
      where: { id: req.params.id, branchId: req.params.branchId },
      include: { product: true, branch: { select: { name: true, city: true } } },
    });
    if (!item) throw new Error("NOT_FOUND");
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// POST
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (req.user!.clientId && req.params.clientId !== req.user!.clientId) throw new Error("FORBIDDEN");
    const body = equipmentSchema.parse(req.body);
    const branch = await getBranchForCompany(req.params.branchId, req.params.clientId, req.user!.companyId!);
    if (!branch) throw new Error("NOT_FOUND");

    const item = await prisma.equipment.create({
      data: {
        ...body,
        installedAt: body.installedAt ? new Date(body.installedAt) : undefined,
        branchId: req.params.branchId,
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

// PUT /:id - admin only
router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = equipmentSchema.partial().parse(req.body);
    const branch = await getBranchForCompany(req.params.branchId, req.params.clientId, req.user!.companyId!);
    if (!branch) throw new Error("NOT_FOUND");

    const item = await prisma.equipment.findFirst({ where: { id: req.params.id, branchId: req.params.branchId } });
    if (!item) throw new Error("NOT_FOUND");

    const updated = await prisma.equipment.update({
      where: { id: req.params.id },
      data: { ...body, installedAt: body.installedAt ? new Date(body.installedAt) : undefined },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /:id - admin only
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const branch = await getBranchForCompany(req.params.branchId, req.params.clientId, req.user!.companyId!);
    if (!branch) throw new Error("NOT_FOUND");

    const item = await prisma.equipment.findFirst({ where: { id: req.params.id, branchId: req.params.branchId } });
    if (!item) throw new Error("NOT_FOUND");

    await prisma.equipment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Equipment deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
