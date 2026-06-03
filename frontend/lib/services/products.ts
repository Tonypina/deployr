import { api } from "@/lib/api-client";
import { Product } from "@/lib/types";

export async function getProducts() {
  const res = await api.get<Product[]>("/api/products");
  return res.data ?? [];
}

export async function createProduct(data: {
  name: string;
  category?: string;
  description?: string;
}) {
  await api.post("/api/products", data);
}

export async function deleteProduct(id: string) {
  await api.del(`/api/products/${id}`);
}
