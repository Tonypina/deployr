import { useEffect, useState } from "react";
import { PlanFeatures } from "@/lib/types";
import { getPlanFeatures } from "@/lib/services/billing";

export function usePlanFeatures() {
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlanFeatures()
      .then(setFeatures)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { features, loading };
}
