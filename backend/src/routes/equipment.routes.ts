import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router({ mergeParams: true }); // /api/clients/:clientId/branches/:branchId/equipment

const equipmentSchema = z.object({
  name: z.string().min(2),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  notes: z.string().optional(),
  installedAt: z.string().datetime().optional(),
  productId: z.string().optional(),
});

async function getBranchForCompany(branchId: string, clientId: string, companyId: string) {
  return prisma.branch.findFirst({
    where: { id: branchId, clientId, client: { companyId } },
  });
}

// GET — accessible by admins and technicians
router.get("/", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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
router.get("/:id", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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

// POST — admin only
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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

// PUT /:id — admin only
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

// DELETE /:id — admin only
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
