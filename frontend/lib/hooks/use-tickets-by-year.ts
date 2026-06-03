"use client";

import { useEffect, useState } from "react";
import { getTickets } from "@/lib/services/tickets";
import { Ticket } from "@/lib/types";

export function useTicketsByYear(year: number) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Paginate through all pages until we have everything
        const all: Ticket[] = [];
        let page = 1;
        const limit = 100;
        while (true) {
          const data = await getTickets({ year, limit, page });
          all.push(...data.tickets);
          if (all.length >= data.total || data.tickets.length < limit) break;
          page++;
        }
        if (!cancelled) setTickets(all);
      } catch {
        // silently fall back to empty — chart will just show no data
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [year]);

  return { tickets, loading };
}
