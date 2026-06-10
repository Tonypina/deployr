import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { encrypt, decrypt, encryptField, decryptField } from "../utils/encryption";
import { getPlanLimits } from "../utils/plan-limits";
import { clean, cleanEmail, cleanOpt } from "../utils/sanitize";

const router = Router();

const clientSchema = z.object({
  name:         z.string().min(2).transform(clean),
  giro:         z.string().optional().nullable().transform(cleanOpt),
  contactEmail: z.string().email().transform(cleanEmail),
  contactPhone: z.string().optional().transform(cleanOpt),
  taxId:        z.string().optional().transform(cleanOpt),
  address:      z.string().optional().transform(cleanOpt),
});

const portalUserSchema = z.object({
  email:    z.string().email().transform(cleanEmail),
  password: z.string().min(8),
  name:     z.string().min(2).transform(clean),
  phone:    z.string().optional().transform(cleanOpt),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

function encryptClient(data: z.infer<typeof clientSchema>) {
  return {
    name: data.name,
    giro: data.giro ?? null,
    contactEmail: encrypt(data.contactEmail),
    contactPhone: encryptField(data.contactPhone),
    taxId: encryptField(data.taxId),
    address: encryptField(data.address),
  };
}

function decryptClient(client: {
  id: string; name: string; giro?: string | null; contactEmail: string; contactPhone: string | null;
  taxId: string | null; address: string | null; createdAt: Date; updatedAt: Date; companyId: string;
  [key: string]: unknown;
}) {
  return {
    ...client,
    contactEmail: decrypt(client.contactEmail),
    contactPhone: decryptField(client.contactPhone),
    taxId: decryptField(client.taxId),
    address: decryptField(client.address),
  };
}

// GET /api/clients/stats
router.get("/stats", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const companyId = req.user!.companyId!;
    const ACTIVE = ["PENDING", "ASSIGNED", "ON_SITE", "IN_PROGRESS", "PENDING_REPORT"];

    const [total, branches, equipment, active] = await prisma.$transaction([
      prisma.client.count({ where: { companyId } }),
      prisma.branch.count({ where: { client: { companyId } } }),
      prisma.equipment.count({ where: { branch: { client: { companyId } } } }),
      prisma.client.count({
        where: { companyId, tickets: { some: { status: { in: ACTIVE as any } } } },
      }),
    ]);

    res.json({ success: true, data: { total, branches, equipment, active } });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients
router.get("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20", search } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    const where = {
      companyId: req.user!.companyId!,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [rawClients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: {
          _count: { select: { branches: true, tickets: true } },
          branches: { select: { _count: { select: { equipment: true } } } },
        },
      }),
      prisma.client.count({ where }),
    ]);

    const clients = rawClients.map((c) => ({
      ...decryptClient(c),
      _count: { branches: c._count.branches, tickets: c._count.tickets },
      equipmentCount: c.branches.reduce((sum, b) => sum + b._count.equipment, 0),
    }));

    res.json({ success: true, data: { clients, total, page: Number(page), limit: take } });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id
router.get("/:id", authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const clientId = req.params.id;

    // ADMIN can access any client in their company
    // CLIENT_USER can only access their own client
    if (user.role === "CLIENT_USER" && user.clientId !== clientId) {
      throw new Error("FORBIDDEN");
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, companyId: user.companyId! },
      include: {
        branches: { include: { equipment: true } },
        users: (user.role === "ADMIN" || user.role === "SUPER_ADMIN") ? { select: { id: true, name: true, email: true, isActive: true, mustChangePassword: true } } : undefined,
      },
    });
    if (!client) throw new Error("NOT_FOUND");
    res.json({ success: true, data: decryptClient(client) });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post("/", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limits = await getPlanLimits(req.user!.companyId!);
    if (limits?.clientMax !== null && limits?.clientMax !== undefined) {
      const count = await prisma.client.count({ where: { companyId: req.user!.companyId! } });
      if (count >= limits.clientMax) throw new Error("PLAN_LIMIT");
    }

    const body = clientSchema.parse(req.body);
    const client = await prisma.client.create({
      data: { ...encryptClient(body), companyId: req.user!.companyId! },
    });
    res.status(201).json({ success: true, data: decryptClient(client) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:id
router.put("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = clientSchema.partial().parse(req.body);
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!existing) throw new Error("NOT_FOUND");

    const updateData: Record<string, string | null> = {};
    if (body.name) updateData.name = body.name;
    if (body.contactEmail) updateData.contactEmail = encrypt(body.contactEmail);
    if ("contactPhone" in body) updateData.contactPhone = encryptField(body.contactPhone) ?? null;
    if ("taxId" in body) updateData.taxId = encryptField(body.taxId) ?? null;
    if ("address" in body) updateData.address = encryptField(body.address) ?? null;

    const updated = await prisma.client.update({ where: { id: req.params.id }, data: updateData });
    res.json({ success: true, data: decryptClient(updated) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/clients/:id/template — assign/unassign report template
router.patch("/:id/template", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { templateId } = z.object({ templateId: z.string().nullable() }).parse(req.body);
    const existing = await prisma.client.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!existing) throw new Error("NOT_FOUND");

    if (templateId) {
      const template = await prisma.reportTemplate.findFirst({ where: { id: templateId, companyId: req.user!.companyId! } });
      if (!template) throw new Error("NOT_FOUND");
    }

    await prisma.client.update({ where: { id: req.params.id }, data: { templateId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/clients/:id
router.delete("/:id", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!client) throw new Error("NOT_FOUND");
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients/:id/users  — create a portal user (temp password, must change on first login)
router.post("/:id/users", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = portalUserSchema.parse(req.body);
    const client = await prisma.client.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!client) throw new Error("NOT_FOUND");

    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new Error("CONFLICT");

    const hashed = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashed,
        name: body.name,
        phone: body.phone,
        role: "CLIENT_USER",
        mustChangePassword: true,
        companyId: req.user!.companyId,
        clientId: client.id,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, mustChangePassword: true, clientId: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/clients/:clientId/users/:userId/password — admin resets a portal user's password
router.put("/:clientId/users/:userId/password", authenticate, requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { password } = resetPasswordSchema.parse(req.body);

    const client = await prisma.client.findFirst({ where: { id: req.params.clientId, companyId: req.user!.companyId! } });
    if (!client) throw new Error("NOT_FOUND");

    const user = await prisma.user.findFirst({
      where: { id: req.params.userId, clientId: req.params.clientId, role: "CLIENT_USER" },
    });
    if (!user) throw new Error("NOT_FOUND");

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { password: hashed, mustChangePassword: true },
    });

    res.json({ success: true, message: "Contraseña actualizada. El usuario deberá cambiarla en su próximo ingreso." });
  } catch (err) {
    next(err);
  }
});

export default router;
