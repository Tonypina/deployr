import { api } from "@/lib/api-client";
import { InventoryItem } from "@/lib/types";

export async function getInventory(params?: { page?: number; limit?: number }) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const q = qs.toString();
  const res = await api.get<{ items: InventoryItem[]; total: number; page: number; limit: number }>(`/api/inventory${q ? `?${q}` : ""}`);
  return res.data!;
}

export async function createInventoryItem(data: {
  name: string;
  sku?: string;
  quantity: number;
  unit?: string;
  minStock?: number;
  description?: string;
}) {
  await api.post("/api/inventory", data);
}

export async function adjustInventory(id: string, delta: number) {
  const res = await api.patch<InventoryItem>(`/api/inventory/${id}/adjust`, { delta });
  return res.data!;
}
