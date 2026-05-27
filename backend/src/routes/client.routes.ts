import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest, paginate } from "../types";
import { encrypt, decrypt, encryptField, decryptField } from "../utils/encryption";

const router = Router();

const clientSchema = z.object({
  name: z.string().min(2),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

const portalUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  phone: z.string().optional(),
});

function encryptClient(data: z.infer<typeof clientSchema>) {
  return {
    name: data.name,
    contactEmail: encrypt(data.contactEmail),
    contactPhone: encryptField(data.contactPhone),
    taxId: encryptField(data.taxId),
    address: encryptField(data.address),
  };
}

function decryptClient(client: {
  id: string; name: string; contactEmail: string; contactPhone: string | null;
  taxId: string | null; address: string | null; createdAt: Date; updatedAt: Date; companyId: string;
}) {
  return {
    ...client,
    contactEmail: decrypt(client.contactEmail),
    contactPhone: decryptField(client.contactPhone),
    taxId: decryptField(client.taxId),
    address: decryptField(client.address),
  };
}

router.use(authenticate, requireAdmin);

// GET /api/clients
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = "1", limit = "20", search } = req.query as Record<string, string>;
    const { take, skip } = paginate(Number(page), Number(limit));

    const clients = await prisma.client.findMany({
      where: { companyId: req.user!.companyId! },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: { _count: { select: { branches: true, tickets: true } } },
    });

    const decrypted = clients.map((c) => {
      const plain = decryptClient(c);
      // Filter by decrypted email if search provided
      if (search && !plain.name.toLowerCase().includes(search.toLowerCase()) &&
          !plain.contactEmail.toLowerCase().includes(search.toLowerCase())) return null;
      return plain;
    }).filter(Boolean);

    res.json({ success: true, data: decrypted });
  } catch (err) {
    next(err);
  }
});

// GET /api/clients/:id
router.get("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: { branches: { include: { equipment: true } }, users: { select: { id: true, name: true, email: true, isActive: true } } },
    });
    if (!client) throw new Error("NOT_FOUND");
    res.json({ success: true, data: decryptClient(client) });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients
router.post("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
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
router.put("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
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

// DELETE /api/clients/:id
router.delete("/:id", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!client) throw new Error("NOT_FOUND");
    await prisma.client.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Client deleted" });
  } catch (err) {
    next(err);
  }
});

// POST /api/clients/:id/users  — create a portal user for this client
router.post("/:id/users", async (req: AuthRequest, res: Response, next: NextFunction) => {
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
        companyId: req.user!.companyId,
        clientId: client.id,
      },
      select: { id: true, name: true, email: true, role: true, clientId: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

export default router;
