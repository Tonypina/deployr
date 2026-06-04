import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../types";

import { clean, cleanEmail, cleanOptNull } from "../utils/sanitize";

const router = Router();

const updateSchema = z.object({
  name:          z.string().min(2).optional().transform(v => v !== undefined ? clean(v) : v),
  email:         z.string().email().optional().transform(v => v !== undefined ? cleanEmail(v) : v),
  phone:         z.string().optional().nullable().transform(cleanOptNull),
  address:       z.string().optional().nullable().transform(cleanOptNull),
  logoUrl:       z.string().url().optional().nullable(),
  rfc:           z.string().optional().nullable().transform(cleanOptNull),
  razonSocial:   z.string().optional().nullable().transform(cleanOptNull),
  regimenFiscal: z.string().optional().nullable().transform(cleanOptNull),
  codigoPostal:  z.string().regex(/^\d{5}$/, "Código postal debe ser 5 dígitos").optional().nullable().or(z.literal("")),
  giro:          z.string().optional().nullable().transform(cleanOptNull),
});

router.use(authenticate, requireAdmin);

// GET /api/company
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const company = await prisma.company.findUnique({ where: { id: req.user!.companyId! } });
    if (!company) throw new Error("NOT_FOUND");
    res.json({ success: true, data: company });
  } catch (err) {
    next(err);
  }
});

// PUT /api/company
router.put("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);

    // If email is being changed, ensure it is not taken by another company
    if (body.email) {
      const existing = await prisma.company.findFirst({
        where: { email: body.email, id: { not: req.user!.companyId! } },
      });
      if (existing) throw new Error("CONFLICT");
    }

    const updated = await prisma.company.update({
      where: { id: req.user!.companyId! },
      data: body,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/company/onboarding-step
router.patch("/onboarding-step", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { step } = z.object({ step: z.number().int().min(1).max(9) }).parse(req.body);
    await prisma.company.update({
      where: { id: req.user!.companyId! },
      data: { onboardingStep: step },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/company/complete-onboarding
router.patch("/complete-onboarding", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.company.update({
      where: { id: req.user!.companyId! },
      data: { onboardingCompleted: true },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
