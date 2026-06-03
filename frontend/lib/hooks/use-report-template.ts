"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { getTemplate, TemplateDetail } from "@/lib/services/report-templates";

export function useReportTemplate(id: string) {
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTemplate(await getTemplate(id));
    } catch {
      toast({ variant: "destructive", title: "No se pudo cargar la plantilla" });
      router.replace("/admin/reports");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  return { template, loading, refetch: load };
}
