"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileCheck, ChevronRight, Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { cn, policyStatusLabel, policyStatusColor, recurrenceLabel, formatDate } from "@/lib/utils";
import { usePolicies } from "@/lib/hooks/use-policies";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { useAuthStore } from "@/lib/auth-store";

const PLANS_WITH_POLICIES = new Set(["PROFESIONAL", "EMPRESARIAL"]);

export default function PoliciesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { policies, total, page, limit, loading, goToPage } = usePolicies({ search: debouncedSearch || undefined });

  useEffect(() => {
    if (user && user.plan !== undefined && !PLANS_WITH_POLICIES.has(user.plan ?? "")) {
      router.replace("/admin");
    }
  }, [user, router]);

  if (!user || (user.plan !== undefined && !PLANS_WITH_POLICIES.has(user.plan ?? ""))) {
    return null;
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pólizas</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} pólizas registradas</p>
        </div>
        <Button asChild>
          <Link href="/admin/policies/new"><Plus className="h-4 w-4 mr-1" />Nueva póliza</Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !policies.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <FileCheck className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{search ? "Sin resultados" : "Sin pólizas"}</p>
            <p className="text-sm text-muted-foreground">
              {search ? "Intenta con otro término" : "Registra la primera póliza"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {policies.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="card-content-tight flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{p.name}</p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium shrink-0", policyStatusColor[p.status])}>
                        {policyStatusLabel[p.status]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{p.client?.name}</p>
                    <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{recurrenceLabel[p.recurrence]}</span>
                      <span>{p.totalTickets} ticket{p.totalTickets !== 1 ? "s" : ""} por equipo</span>
                      <span>{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/policies/${p.id}`}><ChevronRight className="h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} total={total} limit={limit} onPage={goToPage} />
        </>
      )}
    </div>
  );
}
