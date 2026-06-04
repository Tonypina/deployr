import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/plans — public, no auth required
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { sortOrder: "asc" },
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
});

export default router;
