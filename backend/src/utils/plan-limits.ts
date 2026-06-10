import { prisma } from "../lib/prisma";
import { PlanTier } from "@prisma/client";

export interface PlanLimits {
  plan: PlanTier;
  ticketMax: number | null;
  techMax: number | null;
  adminMax: number | null;
  clientMax: number | null;
  inventoryMax: number | null;
  templateMax: number | null;
  allowPolicies: boolean;
}

export async function getPlanLimits(companyId: string): Promise<PlanLimits | null> {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    select: { plan: true },
  });
  if (!sub) return null;

  const plan = await prisma.plan.findUnique({
    where: { tier: sub.plan },
    select: {
      ticketMax: true,
      techMax: true,
      adminMax: true,
      clientMax: true,
      inventoryMax: true,
      templateMax: true,
      allowPolicies: true,
    },
  });
  if (!plan) return null;

  return {
    plan: sub.plan,
    ticketMax: plan.ticketMax,
    techMax: plan.techMax,
    adminMax: plan.adminMax,
    clientMax: plan.clientMax,
    inventoryMax: plan.inventoryMax,
    templateMax: plan.templateMax,
    allowPolicies: plan.allowPolicies ?? true,
  };
}
