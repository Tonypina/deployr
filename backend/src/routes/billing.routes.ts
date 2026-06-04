import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, requireAdmin } from "../middleware/auth";
import { AuthRequest } from "../types";
import {
  stripe,
  PLAN_CONFIG,
  PlanTier,
  createStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  getPriceId,
} from "../utils/stripe";

const router = Router();
router.use(authenticate);

// ── GET /api/billing/plans ─────────────────────────────────────────────────
// Public-ish: returns plan limits and pricing info (no secrets)
router.get("/plans", async (_req, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: PLAN_CONFIG });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/billing/subscription ─────────────────────────────────────────
router.get("/subscription", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { companyId: req.user!.companyId! },
      include: { usageLogs: { orderBy: { periodStart: "desc" }, take: 3 } },
    });

    if (!sub) {
      res.status(404).json({ success: false, message: "No subscription found" });
      return;
    }

    // Include current month ticket usage
    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const ticketCount = await prisma.ticket.count({
      where: {
        companyId: req.user!.companyId!,
        createdAt: { gte: periodStart },
      },
    });

    const planRecord = await prisma.plan.findUnique({ where: { tier: sub.plan as PlanTier } });
    res.json({
      success: true,
      data: {
        ...sub,
        currentMonthTickets: ticketCount,
        ticketLimit: planRecord?.ticketMax ?? null,
        overagePriceMxn: planRecord?.overagePriceMxn ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/billing/checkout ─────────────────────────────────────────────
// Creates a Stripe Checkout session → returns { url }
router.post("/checkout", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      res.status(503).json({ success: false, message: "Stripe no está configurado aún" });
      return;
    }

    const { plan, annual = false } = z.object({
      plan:   z.enum(["INICIADOR", "PROFESIONAL"]),
      annual: z.boolean().default(false),
    }).parse(req.body);

    const priceId = getPriceId(plan, annual);
    if (!priceId) {
      res.status(503).json({ success: false, message: `Precio de Stripe no configurado para ${plan}` });
      return;
    }

    const company = await prisma.company.findUnique({
      where: { id: req.user!.companyId! },
      include: { subscription: true },
    });
    if (!company) throw new Error("NOT_FOUND");

    // Create or reuse Stripe customer
    let stripeCustomerId = company.subscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await createStripeCustomer(company.email, company.name, company.id);
      stripeCustomerId = customer.id;
      await prisma.subscription.upsert({
        where: { companyId: company.id },
        create: {
          companyId: company.id,
          stripeCustomerId,
          plan: "INICIADOR",
          status: "TRIALING",
        },
        update: { stripeCustomerId },
      });
    }

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      companyId: company.id,
      trialDays: company.subscription?.status === "TRIALING" ? 14 : 0,
      returnUrl: `${frontendUrl}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.json({ success: true, data: { clientSecret: session.client_secret } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/billing/checkout-status?session_id=xxx ───────────────────────
router.get("/checkout-status", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      res.status(503).json({ success: false, message: "Stripe no está configurado" });
      return;
    }
    const { session_id } = req.query as Record<string, string>;
    if (!session_id) {
      res.status(422).json({ success: false, message: "session_id requerido" });
      return;
    }
    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({ success: true, data: { status: session.status, customerEmail: session.customer_details?.email } });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/billing/portal ───────────────────────────────────────────────
// Opens Stripe Customer Portal (manage payment methods, cancel, invoices)
router.post("/portal", requireAdmin, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!stripe) {
      res.status(503).json({ success: false, message: "Stripe no está configurado aún" });
      return;
    }

    const sub = await prisma.subscription.findUnique({
      where: { companyId: req.user!.companyId! },
    });

    if (!sub?.stripeCustomerId) {
      res.status(422).json({ success: false, message: "No hay una suscripción activa de Stripe" });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const session = await createBillingPortalSession(
      sub.stripeCustomerId,
      `${frontendUrl}/admin/billing`
    );

    res.json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
});

export default router;
