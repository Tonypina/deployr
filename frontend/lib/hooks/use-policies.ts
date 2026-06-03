"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { listPolicies, getUpcomingPolicyTickets } from "@/lib/services/policies";
import { Policy, Ticket } from "@/lib/types";

const LIMIT = 5;

export function usePolicies(params?: { search?: string }) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const search = params?.search;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await listPolicies({ page: p, limit: LIMIT, search });
      setPolicies(data.policies);
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

  return { policies, total, page, limit: LIMIT, loading, refetch: () => load(page), goToPage };
}

export function useUpcomingPolicyTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTickets(await getUpcomingPolicyTickets());
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { tickets, loading, refetch: load };
}
