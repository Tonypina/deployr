"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getInventory } from "@/lib/services/inventory";
import { InventoryItem } from "@/lib/types";

const LIMIT = 5;

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await getInventory({ page: p, limit: LIMIT });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  function goToPage(p: number) {
    setPage(p);
    load(p);
  }

  return { items, total, page, limit: LIMIT, loading, refetch: () => load(page), goToPage };
}
