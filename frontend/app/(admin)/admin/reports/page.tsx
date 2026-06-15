"use client";

import Link from "next/link";
import { Plus, FileText, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useReportTemplates } from "@/lib/hooks/use-report-templates";
import { PlanLimitBadge } from "@/components/shared/plan-limit-badge";
import { usePlanFeatures } from "@/lib/hooks/use-plan-features";

export default function ReportsPage() {
  const { templates, loading } = useReportTemplates();
  const { features } = usePlanFeatures();

  const customCount = templates.filter((t) => !t.isDefault).length;
  const atTemplateLimit =
    features?.templateMax !== null &&
    features?.templateMax !== undefined &&
    customCount >= features.templateMax;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
                    <div className="flex items-center gap-2 mt-0.5">
            <p className="text-muted-foreground text-sm">{templates.length} plantillas</p>
            <PlanLimitBadge used={customCount} max={features?.templateMax} label="Personalizadas" />
          </div>
        </div>
        {atTemplateLimit ? (
          <Button disabled>
            <Plus className="h-4 w-4 mr-1" />Nueva plantilla
          </Button>
        ) : (
          <Button asChild>
            <Link href="/admin/reports/new"><Plus className="h-4 w-4 mr-1" />Nueva plantilla</Link>
          </Button>
        )}
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
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <Link href={`/admin/reports/${t.id}`}><Pencil className="h-3.5 w-3.5" /></Link>
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
