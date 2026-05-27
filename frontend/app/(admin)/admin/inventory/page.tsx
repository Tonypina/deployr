"use client";

import { useEffect, useState } from "react";
import { Plus, Package, AlertTriangle, Minus } from "lucide-react";
import { api } from "@/lib/api-client";
import { InventoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(0),
  unit: z.string().optional(),
  minStock: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 0 },
  });

  function load() {
    api.get<InventoryItem[]>("/api/inventory")
      .then((r) => setItems(r.data ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.post("/api/inventory", values);
      toast({ title: "Item agregado" });
      reset();
      setShowForm(false);
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function adjust(id: string, delta: number) {
    try {
      const res = await api.patch<InventoryItem>(`/api/inventory/${id}/adjust`, { delta });
      setItems((prev) => prev.map((i) => i.id === id ? res.data! : i));
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  const lowStock = items.filter((i) => i.minStock != null && i.quantity <= i.minStock);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventario</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{items.length} items · {lowStock.length} bajo stock</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Agregar item
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo item</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Nombre</Label>
                <Input placeholder="Filtro de aire" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>SKU</Label>
                <Input placeholder="FA-001" {...register("sku")} />
              </div>
              <div className="grid gap-2">
                <Label>Cantidad inicial</Label>
                <Input type="number" {...register("quantity")} />
              </div>
              <div className="grid gap-2">
                <Label>Unidad</Label>
                <Input placeholder="pzas, litros..." {...register("unit")} />
              </div>
              <div className="grid gap-2">
                <Label>Stock mínimo</Label>
                <Input type="number" {...register("minStock")} />
              </div>
              <div className="sm:col-span-3 flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const isLow = item.minStock != null && item.quantity <= item.minStock;
            return (
              <Card key={item.id} className={isLow ? "border-destructive/50" : ""}>
                <CardContent className="card-content-tight flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{item.name}</p>
                      {isLow && <Badge variant="destructive" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Bajo stock</Badge>}
                    </div>
                    {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                    {item.minStock != null && <p className="text-xs text-muted-foreground">Mínimo: {item.minStock} {item.unit ?? ""}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjust(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-lg font-bold w-12 text-center">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => adjust(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground">{item.unit ?? "uds"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
