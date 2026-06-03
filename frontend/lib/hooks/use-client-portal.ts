"use client";

import { useCallback, useEffect, useState } from "react";
import { getClient } from "@/lib/services/clients";
import { Client, Branch, Equipment } from "@/lib/types";

export type BranchWithEquipment = Branch & { equipment: Equipment[] };
export type ClientWithBranches = Client & { branches: BranchWithEquipment[] };

export function useClientPortal(clientId: string | undefined) {
  const [client, setClient] = useState<ClientWithBranches | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    try {
      setClient(await getClient<ClientWithBranches>(clientId));
    } catch {
      // silently fall back — widget shows empty state
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return { client, loading };
}
