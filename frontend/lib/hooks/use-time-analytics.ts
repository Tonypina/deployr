"use client";

import { useEffect, useState } from "react";
import { getTimeAnalytics, ClientTimeAnalytics } from "@/lib/services/tickets";

export function useTimeAnalytics() {
  const [data, setData] = useState<ClientTimeAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTimeAnalytics()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { data, loading };
}
