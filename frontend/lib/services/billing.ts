import { api } from "@/lib/api-client";
import { Subscription } from "@/lib/types";

export async function getSubscription() {
  const res = await api.get<Subscription>("/api/billing/subscription");
  return res.data!;
}

export async function createCheckoutSession(plan: "INICIADOR" | "PROFESIONAL", annual: boolean) {
  const res = await api.post<{ clientSecret: string }>("/api/billing/checkout", { plan, annual });
  return res.data!;
}

export async function getCheckoutStatus(sessionId: string) {
  const res = await api.get<{ status: string; customerEmail?: string }>(
    `/api/billing/checkout-status?session_id=${sessionId}`
  );
  return res.data!;
}

export async function createPortalSession() {
  const res = await api.post<{ url: string }>("/api/billing/portal", {});
  return res.data!;
}
