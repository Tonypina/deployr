"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, Star } from "lucide-react";
import { api } from "@/lib/api-client";
import { ReportTemplate } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function ReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ReportTemplate[]>("/api/report-templates")
      .then((r) => setTemplates(r.data ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plantillas de reporte</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{templates.length} plantillas</p>
        </div>
        <Button asChild>
          <Link href="/admin/reports/new"><Plus className="h-4 w-4 mr-1" />Nueva plantilla</Link>
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !templates.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <FileText className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin plantillas</p>
            <p className="text-sm text-muted-foreground">Crea la primera plantilla de reporte</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardContent className="card-content-tight">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{t.name}</span>
                      {t.isDefault && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3" />Predeterminada
                        </span>
                      )}
                    </div>
                    {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {t._count?.fields ?? 0} campos · {t._count?.clients ?? 0} clientes
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/reports/${t.id}`}>Editar</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
