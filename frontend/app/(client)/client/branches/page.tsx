"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ChevronRight, Cpu } from "lucide-react";
import { Branch, Equipment } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { getBranches, getEquipment } from "@/lib/services/clients";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

type BranchWithEquipment = Branch & { equipment: Equipment[] | null };

export default function ClientBranchesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [branches, setBranches] = useState<BranchWithEquipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadBranches = useCallback(async () => {
    if (!user?.clientId) return;
    try {
      const data = await getBranches(user.clientId);
      setBranches((prev) => {
        const existing = new Map(prev.map((b) => [b.id, b]));
        return data.map((b) => existing.get(b.id) ?? { ...b, equipment: null });
      });
      setExpanded((prev) => new Set([...prev, ...data.map((b) => b.id)]));
    } catch {
      toast({ variant: "destructive", title: "No se pudieron cargar las sucursales" });
      router.replace("/client");
    } finally {
      setLoading(false);
    }
  }, [user?.clientId, router]);

  useEffect(() => { loadBranches(); }, [loadBranches]);

  useEffect(() => {
    if (!user?.clientId || !branches.length) return;
    branches.forEach((b) => {
      if (b.equipment !== null) return;
      getEquipment(user.clientId!, b.id)
        .then((eq) => setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, equipment: eq } : x))))
        .catch(() => setBranches((prev) => prev.map((x) => (x.id === b.id ? { ...x, equipment: [] } : x))));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length, user?.clientId]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <h1 className="text-2xl font-bold tracking-tight">
          Mis Sucursales
          {!loading && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">({branches.length})</span>
          )}
        </h1>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !branches.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-2">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Sin sucursales</p>
            <p className="text-xs text-muted-foreground">Tu empresa aún no tiene sucursales registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {branches.map((branch) => {
            const isOpen = expanded.has(branch.id);
            return (
              <Card key={branch.id}>
                <div
                  className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none hover:bg-muted/40 transition-colors"
                  onClick={() => toggle(branch.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <span className="font-semibold truncate">{branch.name}</span>
                    </div>
                    <div className="pl-6 mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {branch.city && <span>{branch.city}</span>}
                      {branch.address && <span>{branch.address}</span>}
                      {branch.phone && <span>{branch.phone}</span>}
                      {branch.contactEmail && <span>{branch.contactEmail}</span>}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border">
                    <div className="px-4 py-3 flex items-center gap-2 text-sm font-medium">
                      <Cpu className="h-4 w-4 text-muted-foreground" />
                      Equipos
                      <span className="text-muted-foreground font-normal">
                        ({branch.equipment?.length ?? "…"})
                      </span>
                    </div>

                    {branch.equipment === null ? (
                      <p className="px-4 pb-4 text-xs text-muted-foreground">Cargando equipos...</p>
                    ) : !branch.equipment.length ? (
                      <p className="px-4 pb-4 text-xs text-muted-foreground">Sin equipos registrados</p>
                    ) : (
                      <div className="px-4 pb-4 grid gap-2">
                        {branch.equipment.map((eq) => (
                          <div
                            key={eq.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{eq.name}</span>
                              <div className="flex flex-wrap gap-x-2 text-xs text-muted-foreground mt-0.5">
                                {eq.brand && <span>{eq.brand}</span>}
                                {eq.model && <span>Modelo: {eq.model}</span>}
                                {eq.serialNumber && <span>S/N: {eq.serialNumber}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
