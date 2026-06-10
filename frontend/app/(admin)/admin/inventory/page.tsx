"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Package, AlertTriangle, PackageX, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useInventory } from "@/lib/hooks/use-inventory";
import { createInventoryItem, adjustInventory, getInventory } from "@/lib/services/inventory";
import { Pagination } from "@/components/ui/pagination";
import { StatsCard } from "@/components/shared/stats-card";
import { cn } from "@/lib/utils";
import { InventoryItem } from "@/lib/types";
import { PlanLimitBadge } from "@/components/shared/plan-limit-badge";
import { usePlanFeatures } from "@/lib/hooks/use-plan-features";

const schema = z.object({
  name:        z.string().min(2),
  sku:         z.string().optional(),
  quantity:    z.coerce.number().int().min(0),
  unit:        z.string().optional(),
  minStock:    z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function itemStatus(item: InventoryItem) {
  if (item.quantity === 0)
    return { label: "Sin stock",   className: "bg-destructive/10 text-destructive" };
  if (item.minStock != null && item.quantity <= item.minStock)
    return { label: "Stock bajo",  className: "bg-amber-accent/10 text-amber-accent" };
  return   { label: "En stock",    className: "bg-tertiary/10 text-tertiary" };
}

function refreshStats(set: (items: InventoryItem[]) => void) {
  getInventory({ limit: 500 }).then((d) => set(d.items)).catch(() => {});
}

export default function InventoryPage() {
  const { items, total, page, limit, loading, refetch, goToPage } = useInventory();
  const { features } = usePlanFeatures();
  const atInventoryLimit = features?.inventoryMax !== null && features?.inventoryMax !== undefined && total >= features.inventoryMax;
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [allItems, setAllItems]   = useState<InventoryItem[]>([]);

  useEffect(() => { refreshStats(setAllItems); }, []);

  const lowStock   = useMemo(() => allItems.filter((i) => i.minStock != null && i.quantity > 0 && i.quantity <= i.minStock).length, [allItems]);
  const outOfStock = useMemo(() => allItems.filter((i) => i.quantity === 0).length, [allItems]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 0 },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await createInventoryItem(values);
      toast({ title: "Artículo agregado" });
      reset();
      setShowForm(false);
      refetch();
      refreshStats(setAllItems);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function adjust(id: string, delta: number) {
    try {
      await adjustInventory(id, delta);
      refetch();
      refreshStats(setAllItems);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="page-stack">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-on-surface-variant text-sm">
              {total} artículo{total !== 1 ? "s" : ""} registrado{total !== 1 ? "s" : ""}
            </p>
            <PlanLimitBadge used={total} max={features?.inventoryMax} />
          </div>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} disabled={atInventoryLimit}>
          <Plus className="h-4 w-4 mr-1.5" />Agregar artículo
        </Button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatsCard
          title="Total artículos"
          value={total}
          icon={Package}
          color="text-primary"
        />
        <StatsCard
          title="Stock bajo"
          value={lowStock}
          icon={AlertTriangle}
          color="text-amber-accent"
          description={lowStock > 0 ? "Requieren reabasto pronto" : "Todos en nivel normal"}
        />
        <StatsCard
          title="Sin stock"
          value={outOfStock}
          icon={PackageX}
          color="text-destructive"
          description={outOfStock > 0 ? "Solicitar reabasto urgente" : "Sin faltantes"}
        />
      </div>

      {/* Add item form */}
      {showForm && (
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-on-surface">Nuevo artículo</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-2">
              <Label className="font-label-caps text-on-surface-variant">Nombre *</Label>
              <Input placeholder="Filtro de aire" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label className="font-label-caps text-on-surface-variant">SKU</Label>
              <Input placeholder="FA-001" {...register("sku")} />
            </div>
            <div className="grid gap-2">
              <Label className="font-label-caps text-on-surface-variant">Cantidad inicial</Label>
              <Input type="number" {...register("quantity")} />
            </div>
            <div className="grid gap-2">
              <Label className="font-label-caps text-on-surface-variant">Unidad</Label>
              <Input placeholder="pzas, litros..." {...register("unit")} />
            </div>
            <div className="grid gap-2">
              <Label className="font-label-caps text-on-surface-variant">Stock mínimo</Label>
              <Input type="number" {...register("minStock")} />
            </div>
            <div className="sm:col-span-3 grid gap-2">
              <Label className="font-label-caps text-on-surface-variant">Descripción</Label>
              <Input placeholder="Descripción opcional..." {...register("description")} />
            </div>
            <div className="sm:col-span-3 flex gap-2 justify-end pt-2 border-t border-outline-variant/20">
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar artículo"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="glass-card rounded-xl px-6 py-10 text-center">
          <p className="text-sm text-on-surface-variant">Cargando...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card rounded-xl px-6 py-14 flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center">
            <Package className="h-6 w-6 text-on-surface-variant" />
          </div>
          <p className="font-semibold text-on-surface">Sin artículos</p>
          <p className="text-sm text-on-surface-variant">Agrega tu primer artículo de inventario</p>
        </div>
      ) : (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low">
                    {["Artículo", "Estado", "Stock", "Mínimo", "Descripción"].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-4 font-label-caps text-on-surface-variant border-b border-outline-variant/30"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {items.map((item) => {
                    const status = itemStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">

                        {/* Artículo */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-sm text-on-surface">{item.name}</p>
                          {item.sku && (
                            <p className="text-[10px] font-label-caps text-on-surface-variant mt-0.5">
                              {item.sku}
                            </p>
                          )}
                        </td>

                        {/* Estado */}
                        <td className="px-6 py-4">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.className)}>
                            {status.label}
                          </span>
                        </td>

                        {/* Stock — inline adjuster */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => adjust(item.id, -1)}
                              className="h-6 w-6 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
                              aria-label="Decrementar"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className={cn(
                              "w-10 text-center font-bold text-sm tabular-nums",
                              item.quantity === 0
                                ? "text-destructive"
                                : item.minStock != null && item.quantity <= item.minStock
                                  ? "text-amber-accent"
                                  : "text-on-surface"
                            )}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => adjust(item.id, 1)}
                              className="h-6 w-6 rounded-md bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors"
                              aria-label="Incrementar"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            {item.unit && (
                              <span className="text-xs text-on-surface-variant">{item.unit}</span>
                            )}
                          </div>
                        </td>

                        {/* Mínimo */}
                        <td className="px-6 py-4 text-sm text-on-surface-variant">
                          {item.minStock != null
                            ? <span>{item.minStock}{item.unit ? ` ${item.unit}` : ""}</span>
                            : <span className="text-outline">—</span>
                          }
                        </td>

                        {/* Descripción */}
                        <td className="px-6 py-4 text-sm text-on-surface-variant max-w-[240px]">
                          {item.description
                            ? <span className="truncate block">{item.description}</span>
                            : <span className="text-outline">—</span>
                          }
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} total={total} limit={limit} onPage={goToPage} />
        </>
      )}
    </div>
  );
}
