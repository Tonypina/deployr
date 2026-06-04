import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { constructWebhookEvent, PlanTier } from "../utils/stripe";

type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED";

const router = Router();

// Map Stripe price IDs → PlanTier (read from env)
function planFromPriceId(priceId: string): PlanTier {
  const map: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_INICIADOR_MONTHLY   ?? "__"]: "INICIADOR",
    [process.env.STRIPE_PRICE_INICIADOR_ANNUAL    ?? "__"]: "INICIADOR",
    [process.env.STRIPE_PRICE_PROFESIONAL_MONTHLY ?? "__"]: "PROFESIONAL",
    [process.env.STRIPE_PRICE_PROFESIONAL_ANNUAL  ?? "__"]: "PROFESIONAL",
  };
  return map[priceId] ?? "INICIADOR";
}

function stripeStatusToLocal(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing:           "TRIALING",
    active:             "ACTIVE",
    past_due:           "PAST_DUE",
    canceled:           "CANCELLED",
    paused:             "PAUSED",
    incomplete:         "PAST_DUE",
    incomplete_expired: "CANCELLED",
    unpaid:             "PAST_DUE",
  };
  return map[status] ?? "ACTIVE";
}

// ── POST /api/webhooks/stripe ──────────────────────────────────────────────
// express.raw() is applied at the app level for this path — see app.ts
router.post("/stripe", async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  let event;
  try {
    event = constructWebhookEvent(req.body as Buffer, sig);
  } catch (err) {
    res.status(400).json({ error: `Webhook signature verification failed: ${(err as Error).message}` });
    return;
  }

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as any;
        const companyId: string = session.metadata?.companyId;
        if (!companyId) break;

        const subId: string = session.subscription;
        const customerId: string = session.customer;

        const { default: Stripe } = await import("stripe");
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
        const stripeSub = await stripeInstance.subscriptions.retrieve(subId);
        const priceId = stripeSub.items.data[0]?.price?.id ?? "";
        const plan = planFromPriceId(priceId);

        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan,
            status:              stripeStatusToLocal(stripeSub.status),
            currentPeriodStart:  new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:    new Date(stripeSub.current_period_end   * 1000),
          },
          update: {
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan,
            status:              stripeStatusToLocal(stripeSub.status),
            currentPeriodStart:  new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:    new Date(stripeSub.current_period_end   * 1000),
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const stripeSub = event.data.object as any;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: stripeSub.id },
        });
        if (!sub) break;

        const priceId = stripeSub.items?.data?.[0]?.price?.id ?? sub.stripePriceId ?? "";
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            plan:               planFromPriceId(priceId),
            status:             stripeStatusToLocal(stripeSub.status),
            stripePriceId:      priceId,
            currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
            currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
            cancelledAt:        stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: { status: "CANCELLED", cancelledAt: new Date() },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer },
          data:  { status: "PAST_DUE" },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer, status: "PAST_DUE" },
          data:  { status: "ACTIVE" },
        });
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
