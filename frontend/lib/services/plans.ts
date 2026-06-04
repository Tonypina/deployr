import { api } from "@/lib/api-client";
import { Plan } from "@/lib/types";

let cache: Plan[] | null = null;

export async function getPlans(): Promise<Plan[]> {
  if (cache) return cache;
  const res = await api.get<Plan[]>("/api/plans");
  cache = res.data!;
  return cache;
}
