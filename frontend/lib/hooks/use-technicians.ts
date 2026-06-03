"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getTechnicians } from "@/lib/services/users";
import { Technician } from "@/lib/types";

const LIMIT = 10;

export function useTechnicians(params?: { limit?: number }) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const limit = params?.limit ?? LIMIT;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getTechnicians({ limit, page: p });
      setTechnicians(data.users);
      setTotal(data.total);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  return { technicians, total, page, limit, loading, refetch: () => load(page), goToPage };
}
