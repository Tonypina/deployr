"use client";

import { useState } from "react";
import { Plus, Building2, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useClients } from "@/lib/hooks/use-clients";
import { useDebounce } from "@/lib/hooks/use-debounce";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { clients, total, page, limit, loading, goToPage } = useClients({ search: debouncedSearch || undefined });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{total} clientes registrados</p>
        </div>
        <Button asChild>
          <Link href="/admin/clients/new"><Plus className="h-4 w-4 mr-1" />Nuevo cliente</Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !clients.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{search ? "Sin resultados" : "Sin clientes"}</p>
            <p className="text-sm text-muted-foreground">{search ? "Intenta con otro término" : "Agrega tu primer cliente"}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3">
            {clients.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="card-content-tight flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{c.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{c.contactEmail}</p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{c._count?.branches ?? 0} sucursales</span>
                      <span>{c._count?.tickets ?? 0} tickets</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/admin/clients/${c.id}`}><ChevronRight className="h-4 w-4" /></Link>
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
