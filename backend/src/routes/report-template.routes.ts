import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin, requireAdminOrTech } from "../middleware/auth";
import { AuthRequest } from "../types";
import { getEffectiveTemplate, getOrCreateDefaultTemplate } from "../utils/default-template";
import { Role } from "@prisma/client";

import { clean, cleanOpt } from "../utils/sanitize";

const router = Router();

const templateSchema = z.object({
  name:        z.string().min(2).transform(clean),
  description: z.string().optional().transform(cleanOpt),
});

const fieldSchema = z.object({
  label:    z.string().min(1).transform(clean),
  type:     z.enum(["TEXT", "TEXTAREA", "DATE", "NUMBER", "PHOTO", "MULTISELECT"]),
  required: z.boolean().default(false),
  order:    z.number().int().default(0),
  options:  z.array(z.string()).default([]).transform(arr => arr.map(clean)),
});

router.use(authenticate);

// GET /api/report-templates — admin only
router.get("/", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const templates = await prisma.reportTemplate.findMany({
      where: { companyId: req.user!.companyId! },
      include: { _count: { select: { clients: true, fields: true } } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    res.json({ success: true, data: templates });
  } catch (err) {
    next(err);
  }
});

// GET /api/report-templates/for-ticket/:ticketId — admin + tech
router.get("/for-ticket/:ticketId", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.ticketId } });
    if (!ticket) throw new Error("NOT_FOUND");
    if (req.user!.role === Role.TECHNICIAN && ticket.technicianId !== req.user!.userId) throw new Error("FORBIDDEN");

    const template = await getEffectiveTemplate(req.params.ticketId, ticket.companyId);
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

// GET /api/report-templates/:id — admin + tech
router.get("/:id", requireAdminOrTech, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.reportTemplate.findFirst({
      where: { id: req.params.id, companyId: req.user!.companyId! },
      include: {
        fields: { orderBy: { order: "asc" } },
        _count: { select: { clients: true } },
      },
    });
    if (!template) throw new Error("NOT_FOUND");
    res.json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

// POST /api/report-templates — admin only
router.post("/", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = templateSchema.parse(req.body);
    const template = await prisma.reportTemplate.create({
      data: { ...body, companyId: req.user!.companyId! },
      include: { fields: true },
    });
    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
});

// PUT /api/report-templates/:id — admin only
router.put("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = templateSchema.partial().parse(req.body);
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");

    const updated = await prisma.reportTemplate.update({
      where: { id: req.params.id },
      data: body,
      include: { fields: { orderBy: { order: "asc" } }, _count: { select: { clients: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/report-templates/:id — cannot delete the default
router.delete("/:id", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");
    if (template.isDefault) {
      res.status(422).json({ success: false, message: "No se puede eliminar la plantilla predeterminada" });
      return;
    }
    await prisma.reportTemplate.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/report-templates/:id/set-default
router.patch("/:id/set-default", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");

    await prisma.$transaction([
      prisma.reportTemplate.updateMany({ where: { companyId: req.user!.companyId!, isDefault: true }, data: { isDefault: false } }),
      prisma.reportTemplate.update({ where: { id: req.params.id }, data: { isDefault: true } }),
    ]);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/report-templates/:id/fields
router.post("/:id/fields", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = fieldSchema.parse(req.body);
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");

    const field = await prisma.reportTemplateField.create({
      data: { ...body, templateId: req.params.id },
    });
    res.status(201).json({ success: true, data: field });
  } catch (err) {
    next(err);
  }
});

// PUT /api/report-templates/:id/fields/:fieldId
router.put("/:id/fields/:fieldId", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const body = fieldSchema.partial().parse(req.body);
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");

    const field = await prisma.reportTemplateField.findFirst({ where: { id: req.params.fieldId, templateId: req.params.id } });
    if (!field) throw new Error("NOT_FOUND");

    const updated = await prisma.reportTemplateField.update({ where: { id: req.params.fieldId }, data: body });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/report-templates/:id/fields/:fieldId
router.delete("/:id/fields/:fieldId", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const template = await prisma.reportTemplate.findFirst({ where: { id: req.params.id, companyId: req.user!.companyId! } });
    if (!template) throw new Error("NOT_FOUND");

    const field = await prisma.reportTemplateField.findFirst({ where: { id: req.params.fieldId, templateId: req.params.id } });
    if (!field) throw new Error("NOT_FOUND");

    await prisma.reportTemplateField.delete({ where: { id: req.params.fieldId } });
    res.json({ success: true, message: "Field deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
