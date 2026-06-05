"use client";

import { useEffect, useState } from "react";
import { getClientStats, ClientStats } from "@/lib/services/clients";

export function useClientStats() {
  const [data, setData] = useState<ClientStats>({ total: 0, branches: 0, equipment: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getClientStats()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
