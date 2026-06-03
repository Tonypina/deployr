"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { getClient } from "@/lib/services/clients";
import { getTemplates } from "@/lib/services/report-templates";
import { Client, Branch, Equipment, ReportTemplate, PortalUser } from "@/lib/types";

export type BranchWithEquipment = Branch & { equipment: Equipment[] };
export type ClientDetail = Client & { branches: BranchWithEquipment[]; users: PortalUser[] };

export function useClient(id: string) {
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientData, tmplData] = await Promise.all([
        getClient<ClientDetail>(id),
        getTemplates(),
      ]);
      setClient(clientData);
      setTemplates(tmplData);
    } catch {
      toast({ variant: "destructive", title: "No se pudo cargar el cliente" });
      router.replace("/admin/clients");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  return { client, templates, loading, refetch: load };
}
