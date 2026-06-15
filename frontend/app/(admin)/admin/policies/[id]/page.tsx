"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { ArrowLeft, Cpu, XCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getPolicy, cancelPolicy } from "@/lib/services/policies";
import { Policy } from "@/lib/types";
import { usePageTitle } from "@/lib/page-title";
import { cn, policyStatusLabel, policyStatusColor, recurrenceLabel, statusLabel, statusColor, formatDate } from "@/lib/utils";

const PLANS_WITH_POLICIES = new Set(["PROFESIONAL", "EMPRESARIAL"]);

export default function PolicyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const [policy, setPolicy] = useState<Policy | null>(null);
  usePageTitle(policy?.name ?? "Póliza");
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (user && user.plan !== undefined && !PLANS_WITH_POLICIES.has(user.plan ?? "")) {
      router.replace("/admin");
      return;
    }
    getPolicy(id)
      .then(setPolicy)
      .catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la póliza" }))
      .finally(() => setLoading(false));
  }, [id, user, router]);

  async function handleCancel() {
    if (!confirm("¿Cancelar esta póliza? Los tickets pendientes quedarán cancelados.")) return;
    setCancelling(true);
    try {
      await cancelPolicy(id);
      toast({ title: "Póliza cancelada" });
      router.push("/admin/policies");
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="page-stack">
        <p className="text-sm text-muted-foreground">Póliza no encontrada.</p>
      </div>
    );
  }

  const completedTickets = policy.tickets?.filter((t) => t.status === "COMPLETED" || t.status === "CLOSED").length ?? 0;
  const totalTickets = policy.tickets?.length ?? 0;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
            <Link href="/admin/policies"><ArrowLeft className="h-3.5 w-3.5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", policyStatusColor[policy.status])}>
                {policyStatusLabel[policy.status]}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">{policy.client?.name}</p>
          </div>
        </div>
        {policy.status === "ACTIVE" && (
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleCancel} disabled={cancelling}>
            <XCircle className="h-3.5 w-3.5 mr-1" />
            {cancelling ? "Cancelando..." : "Cancelar póliza"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Detalles</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recurrencia</span>
              <span className="font-medium">{recurrenceLabel[policy.recurrence]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha inicio</span>
              <span className="font-medium">{formatDate(policy.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha fin</span>
              <span className="font-medium">{formatDate(policy.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tickets por equipo</span>
              <span className="font-medium">{policy.totalTickets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">{completedTickets} / {totalTickets} completados</span>
            </div>
            {policy.notes && (
              <div className="pt-1 border-t border-border">
                <p className="text-muted-foreground text-xs mb-1">Notas</p>
                <p>{policy.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Equipos ({policy.equipment?.length ?? 0})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {!policy.equipment?.length ? (
              <p className="text-sm text-muted-foreground">Sin equipos registrados</p>
            ) : (
              <div className="grid gap-1.5">
                {policy.equipment.map((pe) => (
                  <div key={pe.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <p className="font-medium">{pe.equipment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pe.branch.name}{pe.branch.city && ` · ${pe.branch.city}`}
                      {pe.equipment.brand && <> · {pe.equipment.brand}</>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tickets generados ({totalTickets})</CardTitle></CardHeader>
        <CardContent>
          {!policy.tickets?.length ? (
            <p className="text-sm text-muted-foreground">Sin tickets</p>
          ) : (
            <div className="list-rows">
              {policy.tickets.map((t) => (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
