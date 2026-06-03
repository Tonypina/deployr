"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { getTicket } from "@/lib/services/tickets";
import { getReport, getTemplateForTicket, TemplateWithFields } from "@/lib/services/reports";
import { Ticket, TicketReport } from "@/lib/types";

export function useTicket(id: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [report, setReport] = useState<TicketReport | null>(null);
  const [template, setTemplate] = useState<TemplateWithFields | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ticketData = await getTicket(id);
      setTicket(ticketData);
      try {
        const reportData = await getReport(id);
        setReport(reportData);
        if (reportData.template) setTemplate(reportData.template as TemplateWithFields);
      } catch {
        if (ticketData.status === "IN_PROGRESS" || ticketData.status === "PENDING_REPORT") {
          const tmpl = await getTemplateForTicket(id);
          setTemplate(tmpl);
        }
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return { ticket, report, template, loading, setTicket, setTemplate, refetch: load };
}
