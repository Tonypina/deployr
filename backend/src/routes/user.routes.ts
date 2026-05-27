import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(["TECHNICIAN"]),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

// All user routes require admin
router.use(authenticate, requireAdmin);

// GET /api/users?role=TECHNICIAN&page=1
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role, page = "1", limit = "20" } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where: {
          companyId: req.user!.companyId,
          ...(role ? { role: role as "ADMIN" | "TECHNICIAN" } : {}),
        },
        select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.user.count({ where: { companyId: req.user!.companyId, ...(role ? { role: role as "ADMIN" | "TECHNICIAN" } : {}) } }),
    ]);

    res.json({ success: true, data: { users, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

// POST /api/users  — create a TECHNICIAN
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = createUserSchema.parse(req.body);

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new Error("CONFLICT");

    const hashed = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        ...body,
        password: hashed,
        companyId: req.user!.companyId,
      },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, createdAt: true },
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

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: body,
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });

    res.json({ success: true, data: updated });
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
