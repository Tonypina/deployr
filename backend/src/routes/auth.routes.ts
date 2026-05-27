import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { authenticate } from "../middleware/auth";
import { AuthRequest } from "../types";

const router = Router();

const registerSchema = z.object({
  companyName: z.string().min(2),
  companyEmail: z.string().email(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
            role: "ADMIN",
          },
        },
      },
      include: { users: true },
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
      data: { token, user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }, companyId: company.id },
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
      include: { company: { select: { id: true } }, client: { select: { id: true } } },
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

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
          clientId: user.clientId,
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
      select: { id: true, name: true, email: true, role: true, companyId: true, clientId: true, phone: true },
    });
    if (!user) throw new Error("NOT_FOUND");
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
