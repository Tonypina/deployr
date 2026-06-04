import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[stripe] STRIPE_SECRET_KEY not set — billing features disabled");
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-05-27.dahlia" })
  : null;

export type PlanTier = "INICIADOR" | "PROFESIONAL" | "EMPRESARIAL";

// ── Plan config ────────────────────────────────────────────────────────────
// Ticket limits and overage rates per plan (MXN)

export const PLAN_CONFIG: Record<PlanTier, {
  name: string;
  ticketLimit: number | null;   // null = unlimited
  overagePriceMxn: number;      // per ticket
  maxTechnicians: number | null;
}> = {
  INICIADOR: {
    name: "Iniciador",
    ticketLimit: 250,
    overagePriceMxn: 0.70,
    maxTechnicians: 5,
  },
  PROFESIONAL: {
    name: "Profesional",
    ticketLimit: 1500,
    overagePriceMxn: 0.35,
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

export function getPriceId(plan: "INICIADOR" | "PROFESIONAL", annual: boolean): string {
  return annual ? STRIPE_PRICES[plan].annual : STRIPE_PRICES[plan].monthly;
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
      trial_period_days: trialDays,
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

export function constructWebhookEvent(payload: Buffer, signature: string) {
  if (!stripe) throw new Error("Stripe not configured");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}
