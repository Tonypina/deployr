import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { Role } from "@prisma/client";
import { getPlanLimits } from "../utils/plan-limits";
import { clean, cleanEmail, cleanOpt } from "../utils/sanitize";

const router = Router();

const createUserSchema = z.object({
  email:     z.string().email().transform(cleanEmail),
  password:  z.string().min(8),
  name:      z.string().min(2).transform(clean),
  role:      z.enum(["TECHNICIAN", "ADMIN"]),
  phone:     z.string().optional().transform(cleanOpt),
  expertise: z.string().optional().transform(cleanOpt),
});

const updateUserSchema = z.object({
  name:      z.string().min(2).optional().transform(cleanOpt),
  email:     z.string().email().optional().transform(v => v !== undefined ? cleanEmail(v) : v),
  phone:     z.string().optional().nullable().transform(cleanOpt),
  expertise: z.string().optional().nullable().transform(cleanOpt),
  isActive:  z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

// All user routes require admin
router.use(authenticate, requireAdmin);

// GET /api/users?role=TECHNICIAN&page=1
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, page = "1", limit = "20" } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    // ADMIN callers cannot see SUPER_ADMIN users
    const callerIsAdmin = req.user!.role === Role.ADMIN;
    const roleFilter = role
      ? { role: role as Role }
      : callerIsAdmin
        ? { role: { not: Role.SUPER_ADMIN } }
        : {};

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: { companyId: req.user!.companyId, ...roleFilter },
        select: { id: true, name: true, email: true, role: true, phone: true, expertise: true, isActive: true, mustChangePassword: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where: { companyId: req.user!.companyId, ...roleFilter } }),
    ]);

    res.json({ success: true, data: { users, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

// POST /api/users  — create a TECHNICIAN (temp password, must change on first login)
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createUserSchema.parse(req.body);

    // Enforce plan limits for technicians and admins
    const limits = req.user!.companyId ? await getPlanLimits(req.user!.companyId) : null;
    if (limits) {
      if (body.role === "TECHNICIAN" && limits.techMax !== null) {
        const count = await prisma.user.count({ where: { companyId: req.user!.companyId!, role: "TECHNICIAN", isActive: true } });
        if (count >= limits.techMax) throw new Error("PLAN_LIMIT");
      }
      if (body.role === "ADMIN" && limits.adminMax !== null) {
        const count = await prisma.user.count({ where: { companyId: req.user!.companyId!, role: "ADMIN", isActive: true } });
        if (count >= limits.adminMax) throw new Error("PLAN_LIMIT");
      }
    }

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new Error("CONFLICT");

    const hashed = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        ...body,
        password: hashed,
        mustChangePassword: true,
        companyId: req.user!.companyId,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, expertise: true, isActive: true, mustChangePassword: true, createdAt: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id
router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = updateUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!user) throw new Error("NOT_FOUND");
    if (user.role === Role.SUPER_ADMIN && req.user!.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");

    if (body.email && body.email !== user.email) {
      const taken = await prisma.user.findUnique({ where: { email: body.email } });
      if (taken) throw new Error("CONFLICT");
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: body,
      select: { id: true, name: true, email: true, role: true, phone: true, expertise: true, isActive: true, mustChangePassword: true },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/password — admin resets a technician's password
router.put("/:id/password", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!user) throw new Error("NOT_FOUND");
    if (user.role === Role.SUPER_ADMIN && req.user!.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashed, mustChangePassword: true },
    });

    res.json({ success: true, message: "Contraseña actualizada. El usuario deberá cambiarla en su próximo ingreso." });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id  — soft-delete (deactivate)
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId },
    });
    if (!user) throw new Error("NOT_FOUND");
    if (user.role === Role.SUPER_ADMIN && req.user!.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
    if (user.id === req.user!.userId) {
      res.status(400).json({ success: false, message: "Cannot deactivate yourself" });
      return;
    }

    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true, message: "User deactivated" });
  } catch (err) {
    next(err);
  }
});

export default router;
