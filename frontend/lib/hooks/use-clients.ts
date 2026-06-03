"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getClients } from "@/lib/services/clients";
import { Client } from "@/lib/types";

const LIMIT = 5;

export function useClients(params?: { search?: string }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const search = params?.search;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getClients({ page: p, limit: LIMIT, search });
      setClients(data.clients);
      setTotal(data.total);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  return { clients, total, page, limit: LIMIT, loading, refetch: () => load(page), goToPage };
}
