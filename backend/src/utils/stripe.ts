import Stripe from "stripe";
import { SubscriptionStatus } from "@prisma/client";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — billing features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null;

export type PlanTier = "BASICO" | "INICIADOR" | "PROFESIONAL" | "EMPRESARIAL";

// ── Plan config ────────────────────────────────────────────────────────────
// Ticket limits and overage rates per plan (MXN)

export const PLAN_CONFIG: Record<PlanTier, {
  name: string;
  ticketLimit: number | null;   // null = unlimited
  overagePriceMxn: number;      // per ticket
  maxTechnicians: number | null;
}> = {
  BASICO: {
    name: "Básico",
    ticketLimit: 100,
    overagePriceMxn: 25,
    maxTechnicians: 1,
  },
  INICIADOR: {
    name: "Iniciador",
    ticketLimit: 250,
    overagePriceMxn: 25,
    maxTechnicians: 5,
  },
  PROFESIONAL: {
    name: "Profesional",
    ticketLimit: 1500,
    overagePriceMxn: 15,
    maxTechnicians: 20,
  },
  EMPRESARIAL: {
    name: "Empresarial",
    ticketLimit: null,
    overagePriceMxn: 0,
    maxTechnicians: null,
  },
};

// ── Stripe Price IDs (set in .env) ─────────────────────────────────────────
// Created in Stripe Dashboard → Products → Add product

export const STRIPE_PRICES = {
  BASICO: {
    monthly: process.env.STRIPE_PRICE_BASICO_MONTHLY    ?? "",
    annual:  process.env.STRIPE_PRICE_BASICO_ANNUAL     ?? "",
  },
  INICIADOR: {
    monthly: process.env.STRIPE_PRICE_INICIADOR_MONTHLY ?? "",
    annual:  process.env.STRIPE_PRICE_INICIADOR_ANNUAL  ?? "",
  },
  PROFESIONAL: {
    monthly: process.env.STRIPE_PRICE_PROFESIONAL_MONTHLY ?? "",
    annual:  process.env.STRIPE_PRICE_PROFESIONAL_ANNUAL  ?? "",
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

export function getPriceId(plan: "BASICO" | "INICIADOR" | "PROFESIONAL", annual: boolean): string {
  return annual ? STRIPE_PRICES[plan].annual : STRIPE_PRICES[plan].monthly;
}

// Map a Stripe price id → PlanTier using the env-configured price ids.
// Unknown price ids fall back to the cheapest plan (least privilege) and warn,
// rather than silently granting a higher tier.
export function planFromPriceId(priceId: string): PlanTier {
  const map: Record<string, PlanTier> = {
    [process.env.STRIPE_PRICE_BASICO_MONTHLY      ?? "__"]: "BASICO",
    [process.env.STRIPE_PRICE_BASICO_ANNUAL       ?? "__"]: "BASICO",
    [process.env.STRIPE_PRICE_INICIADOR_MONTHLY   ?? "__"]: "INICIADOR",
    [process.env.STRIPE_PRICE_INICIADOR_ANNUAL    ?? "__"]: "INICIADOR",
    [process.env.STRIPE_PRICE_PROFESIONAL_MONTHLY ?? "__"]: "PROFESIONAL",
    [process.env.STRIPE_PRICE_PROFESIONAL_ANNUAL  ?? "__"]: "PROFESIONAL",
  };
  const plan = map[priceId];
  if (!plan) console.warn(`[stripe] unknown price id "${priceId}" — defaulting to BASICO`);
  return plan ?? "BASICO";
}

// Map a Stripe subscription status string → local SubscriptionStatus enum.
export function stripeStatusToLocal(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing:           "ACTIVE",
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

export async function createStripeCustomer(email: string, companyName: string, companyId: string) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.customers.create({
    email,
    name: companyName,
    metadata: { companyId },
  });
}

export async function createCheckoutSession({
  customerId,
  priceId,
  companyId,
  trialDays = 14,
  returnUrl,
}: {
  customerId: string;
  priceId: string;
  companyId: string;
  trialDays?: number;
  returnUrl: string;
}) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    ui_mode: "embedded_page",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
      metadata: { companyId },
    },
    return_url: returnUrl,
    metadata: { companyId },
    allow_promotion_codes: true,
    billing_address_collection: "required",
  });
}

export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  if (!stripe) throw new Error("Stripe not configured");
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// In API version 2026-05-27.dahlia the billing period moved from the
// Subscription object onto each SubscriptionItem. Read it from the first item.
export function subscriptionPeriod(sub: {
  items?: { data?: Array<{ current_period_start?: number | null; current_period_end?: number | null }> };
}): {
  currentPeriodStart: Date | undefined;
  currentPeriodEnd: Date | undefined;
} {
  const item = sub.items?.data?.[0];
  const toDate = (ts?: number | null) => (ts ? new Date(ts * 1000) : undefined);
  return {
    currentPeriodStart: toDate(item?.current_period_start),
    currentPeriodEnd: toDate(item?.current_period_end),
  };
}

export function constructWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new Error("Stripe not configured");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
