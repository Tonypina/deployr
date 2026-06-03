"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getTickets } from "@/lib/services/tickets";
import { Ticket } from "@/lib/types";

const LIMIT = 5;

export function useTickets(params?: { status?: string; limit?: number; orderBy?: "createdAt" | "updatedAt" }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const status = params?.status;
  const limit = params?.limit ?? LIMIT;
  const orderBy = params?.orderBy;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getTickets({ status, limit, page: p, orderBy });
      setTickets(data.tickets);
      setTotal(data.total);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [status, limit, orderBy]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  return { tickets, total, page, limit, loading, refetch: () => load(page), goToPage };
}
