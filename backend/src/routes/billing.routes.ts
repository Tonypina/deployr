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
      plan:   z.enum(["BASICO", "INICIADOR", "PROFESIONAL"]),
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
          plan: plan as PlanTier,
          status: "TRIALING",
        },
        update: { stripeCustomerId },
      });
    }

    const now = new Date();
    const trialEndsAt = company.subscription?.trialEndsAt;
    const trialDays = trialEndsAt && trialEndsAt > now
      ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      companyId: company.id,
      trialDays,
      returnUrl: `${frontendUrl}/admin/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    });

    res.json({ success: true, data: { clientSecret: session.client_secret } });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/billing/checkout-status?session_id=xxx ───────────────────────
// Also syncs the subscription from Stripe if the session is complete but the
// webhook hasn't fired yet (common in local dev without stripe listen).
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

    if (session.status === "complete" && session.subscription) {
      const companyId = req.user!.companyId!;
      const existing = await prisma.subscription.findUnique({
        where: { companyId },
        select: { stripeSubscriptionId: true },
      });

      // Only sync if the webhook hasn't already written the stripeSubscriptionId
      if (!existing?.stripeSubscriptionId) {
        const subId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as any)?.id ?? "";

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const priceId = stripeSub.items.data[0]?.price?.id ?? "";

        const statusMap: Record<string, string> = {
          trialing:           "TRIALING",
          active:             "ACTIVE",
          past_due:           "PAST_DUE",
          canceled:           "CANCELLED",
          paused:             "PAUSED",
          incomplete:         "PAST_DUE",
          incomplete_expired: "CANCELLED",
          unpaid:             "PAST_DUE",
        };
        const priceToTier: Record<string, string> = {
          [process.env.STRIPE_PRICE_BASICO_MONTHLY      ?? "__"]: "BASICO",
          [process.env.STRIPE_PRICE_BASICO_ANNUAL       ?? "__"]: "BASICO",
          [process.env.STRIPE_PRICE_INICIADOR_MONTHLY   ?? "__"]: "INICIADOR",
          [process.env.STRIPE_PRICE_INICIADOR_ANNUAL    ?? "__"]: "INICIADOR",
          [process.env.STRIPE_PRICE_PROFESIONAL_MONTHLY ?? "__"]: "PROFESIONAL",
          [process.env.STRIPE_PRICE_PROFESIONAL_ANNUAL  ?? "__"]: "PROFESIONAL",
        };

        await prisma.subscription.update({
          where: { companyId },
          data: {
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan:                 (priceToTier[priceId] ?? "INICIADOR") as PlanTier,
            status:               (statusMap[stripeSub.status] ?? "ACTIVE") as any,
            ...(stripeSub.current_period_start ? { currentPeriodStart: new Date(stripeSub.current_period_start * 1000) } : {}),
            ...(stripeSub.current_period_end   ? { currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000) } : {}),
          },
        });
      }
    }

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
