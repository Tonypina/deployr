import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import {
  constructWebhookEvent,
  subscriptionPeriod,
  planFromPriceId,
  stripeStatusToLocal,
} from "../utils/stripe";

const router = Router();

// Records the event id and returns false. If the id already exists (unique
// violation) it returns true → the event is a duplicate delivery and is skipped.
// Degrades to false if the dedup table hasn't been migrated yet, so webhook
// handling never regresses. The `as any` is temporary until `prisma generate`
// runs against the new ProcessedWebhookEvent model.
async function alreadyProcessed(eventId: string, type: string): Promise<boolean> {
  try {
    await (prisma as any).processedWebhookEvent.create({ data: { id: eventId, type } });
    return false;
  } catch (err: any) {
    if (err?.code === "P2002") return true; // duplicate primary key
    console.error("[webhooks] idempotency check skipped:", err?.message ?? err);
    return false;
  }
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

  // Idempotency: skip events we've already processed (Stripe retries deliveries).
  if (await alreadyProcessed(event.id, event.type)) {
    res.json({ received: true, duplicate: true });
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

        const periodData = subscriptionPeriod(stripeSub);
        await prisma.subscription.upsert({
          where: { companyId },
          create: {
            companyId,
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan,
            status: stripeStatusToLocal(stripeSub.status),
            ...periodData,
          },
          update: {
            stripeCustomerId:     customerId,
            stripeSubscriptionId: subId,
            stripePriceId:        priceId,
            plan,
            status: stripeStatusToLocal(stripeSub.status),
            ...periodData,
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
            ...subscriptionPeriod(stripeSub),
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
