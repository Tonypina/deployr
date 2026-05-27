"use client";

import { useEffect, useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { api } from "@/lib/api-client";
import { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2),
  category: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function load() {
    api.get<Product[]>("/api/products")
      .then((r) => setProducts(r.data ?? []))
      .catch((e) => toast({ variant: "destructive", title: "Error", description: e.message }))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.post("/api/products", values);
      toast({ title: "Producto creado" });
      reset();
      setShowForm(false);
      load();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api.del(`/api/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: (e as Error).message });
    }
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Productos / Servicios</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{products.length} productos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-1" />Nuevo producto
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-base">Nuevo producto</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Nombre *</Label>
                <Input placeholder="Compresor de aire" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Input placeholder="Industrial, HVAC..." {...register("category")} />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label>Descripción</Label>
                <Input placeholder="Descripción del producto o servicio" {...register("description")} />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !products.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-2">
            <Wrench className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Sin productos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
                    {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{p._count?.equipment ?? 0} equipos vinculados</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteProduct(p.id)}>
                    Eliminar
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
