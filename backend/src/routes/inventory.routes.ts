import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { getPlanLimits } from "../utils/plan-limits";

import { clean, cleanOpt } from "../utils/sanitize";

const router = Router();

const itemSchema = z.object({
  name:        z.string().min(2).transform(clean),
  description: z.string().optional().transform(cleanOpt),
  sku:         z.string().optional().transform(cleanOpt),
  quantity:    z.number().int().min(0).default(0),
  unit:        z.string().optional().transform(cleanOpt),
  minStock:    z.number().int().min(0).optional(),
});

const adjustSchema = z.object({
  delta:  z.number().int(),
  reason: z.string().optional().transform(cleanOpt),
});

router.get("/", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20" } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    const where = { companyId: req.user!.companyId! };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, orderBy: { name: "asc" }, take, skip }),
      prisma.inventoryItem.count({ where }),
    ]);

    res.json({ success: true, data: { items, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

router.post("/", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limits = await getPlanLimits(req.user!.companyId!);
    if (limits?.inventoryMax !== null && limits?.inventoryMax !== undefined) {
      const count = await prisma.inventoryItem.count({ where: { companyId: req.user!.companyId! } });
      if (count >= limits.inventoryMax) throw new Error("PLAN_LIMIT");
    }

    const body = itemSchema.parse(req.body);
    const item = await prisma.inventoryItem.create({
      data: { ...body, companyId: req.user!.companyId! },
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = itemSchema.partial().parse(req.body);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!item) throw new Error("NOT_FOUND");

    const updated = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/inventory/:id/adjust  — add or subtract stock
router.patch("/:id/adjust", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { delta } = adjustSchema.parse(req.body);
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!item) throw new Error("NOT_FOUND");

    const newQty = item.quantity + delta;
    if (newQty < 0) {
      res.status(400).json({ success: false, message: "Insufficient stock" });
      return;
    }

    const updated = await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { quantity: newQty } });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", authenticate, requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!item) throw new Error("NOT_FOUND");
    await prisma.inventoryItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
