"use client";

import { FileCheck, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, policyStatusLabel, policyStatusColor, recurrenceLabel, statusColor, statusLabel, formatDate } from "@/lib/utils";
import { usePolicies } from "@/lib/hooks/use-policies";

export default function ClientPoliciesPage() {
  const { policies, loading } = usePolicies();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
                    <p className="text-muted-foreground text-sm mt-0.5">Servicios contratados y sus visitas programadas</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !policies.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <FileCheck className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin pólizas activas</p>
            <p className="text-sm text-muted-foreground">Contacta a tu proveedor para contratar una póliza de servicio</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {policies.map((p) => {
            const isOpen = expanded === p.id;
            return (
              <Card key={p.id}>
                <CardContent className="card-content-tight">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{p.name}</p>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", policyStatusColor[p.status])}>
                          {policyStatusLabel[p.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-muted-foreground">
                        <span>{recurrenceLabel[p.recurrence]}</span>
                        <span>{p.totalTickets} ticket{p.totalTickets !== 1 ? "s" : ""} por equipo</span>
                        <span>{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setExpanded(isOpen ? null : p.id)}
                    >
                      {isOpen
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />
                      }
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-border grid gap-4">
                      {p.equipment && p.equipment.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Equipos incluidos</p>
                          <div className="grid gap-1">
                            {p.equipment.map((pe) => (
                              <div key={pe.id} className="rounded-md border border-border px-3 py-2 text-sm">
                                <p className="font-medium">{pe.equipment.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pe.branch.name}{pe.branch.city && ` · ${pe.branch.city}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {p.tickets && p.tickets.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Visitas programadas</p>
                          <div className="list-rows">
                            {p.tickets.map((t) => (
                              <div key={t.id} className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{t.title}</p>
                                  {t.scheduledAt && (
                                    <p className="text-xs text-muted-foreground">{formatDate(t.scheduledAt)}</p>
                                  )}
                                </div>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", statusColor[t.status])}>
                                  {statusLabel[t.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
