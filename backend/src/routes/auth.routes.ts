import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";
import { clean, cleanEmail } from "../utils/sanitize";
import { getPlanLimits } from "../utils/plan-limits";

const router = Router();

const registerSchema = z.object({
  companyName:   z.string().min(2).transform(clean),
  companyEmail:  z.string().email().transform(cleanEmail),
  adminName:     z.string().min(2).transform(clean),
  adminEmail:    z.string().email().transform(cleanEmail),
  adminPassword: z.string().min(8),
  plan:          z.enum(["basico", "iniciador", "profesional", "empresarial"]).optional(),
});

const PLAN_MAP: Record<string, "BASICO" | "INICIADOR" | "PROFESIONAL" | "EMPRESARIAL"> = {
  basico:   "BASICO",
  iniciador:   "INICIADOR",
  profesional: "PROFESIONAL",
  empresarial: "EMPRESARIAL",
};

const loginSchema = z.object({
  email:    z.string().email().transform(cleanEmail),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

// POST /api/auth/register  — creates a company + its first ADMIN user
router.post("/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: body.adminEmail } });
    if (existing) throw new Error("CONFLICT");

    const hashed = await bcrypt.hash(body.adminPassword, 12);

    const company = await prisma.company.create({
      data: {
        name: body.companyName,
        email: body.companyEmail,
        users: {
          create: {
            email: body.adminEmail,
            password: hashed,
            name: body.adminName,
            role: "SUPER_ADMIN",
          },
        },
      },
      include: { users: true },
    });

    // Create a 14-day trial subscription with the selected plan
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const plan = PLAN_MAP[body.plan ?? "iniciador"] ?? "INICIADOR";
    await prisma.subscription.create({
      data: {
        companyId: company.id,
        plan,
        status: "TRIALING",
        trialEndsAt,
      },
    });

    const admin = company.users[0];
    const token = signToken({
      userId: admin.id,
      email: admin.email,
      role: admin.role,
      companyId: company.id,
    });

    res.status(201).json({
      success: true,
      data: { token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, plan, mustChangePassword: false, onboardingCompleted: false }, companyId: company.id },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, onboardingCompleted: true } }, client: { select: { id: true } } },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? undefined,
      clientId: user.clientId ?? undefined,
    });

    const limits = user.companyId ? await getPlanLimits(user.companyId) : null;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          plan: limits?.plan ?? null,
          companyId: user.companyId,
          clientId: user.clientId,
          mustChangePassword: user.mustChangePassword,
          onboardingCompleted: user.company?.onboardingCompleted ?? true,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, name: true, email: true, role: true, companyId: true, clientId: true, phone: true, mustChangePassword: true,
        company: { select: { onboardingCompleted: true } },
      },
    });
    if (!user) throw new Error("NOT_FOUND");
    const { company, ...rest } = user;
    res.json({ success: true, data: { ...rest, onboardingCompleted: company?.onboardingCompleted ?? true } });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password — authenticated user changes their own password
router.post("/change-password", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new Error("NOT_FOUND");

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ success: false, message: "La contraseña actual es incorrecta" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    res.json({ success: true, message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    next(err);
  }
});

export default router;
