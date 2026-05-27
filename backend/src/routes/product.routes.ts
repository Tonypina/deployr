import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string().optional(),
});

router.use(authenticate, requireAdmin);

router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.product.findMany({
      where: { companyId: req.user!.companyId! },
      include: { _count: { select: { equipment: true } } },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: { ...body, companyId: req.user!.companyId! },
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = productSchema.partial().parse(req.body);
    const product = await prisma.product.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!product) throw new Error("NOT_FOUND");

    const updated = await prisma.product.update({ where: { id: req.params.id }, data: body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!product) throw new Error("NOT_FOUND");
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Product deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
